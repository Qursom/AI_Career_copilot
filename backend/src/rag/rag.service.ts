import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { EmbeddingService } from './embeddings/embedding.service';
import { RAG_VECTOR_STORE } from './rag.tokens';
import type { RagContext, RagEvidence } from './rag.types';
import type { VectorStore } from './vector/vector-store.interface';

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  /**
   * Set when the corpus cannot answer queries meaningfully (missing collection
   * or a vector width that does not match the active embedding provider).
   * Retrieval then returns empty context instead of nonsense.
   */
  private disabledReason: string | null = null;
  private providerMismatchLogged = false;

  constructor(
    private readonly config: TypedConfigService,
    private readonly embeddings: EmbeddingService,
    @Inject(RAG_VECTOR_STORE) private readonly store: VectorStore,
  ) {}

  /**
   * Inspect the collection once at boot. Without this the difference between
   * "never ingested" and "retrieved nothing for this resume" is invisible,
   * since both produce an empty context.
   */
  async onModuleInit(): Promise<void> {
    if (!this.config.get('RAG_ENABLED')) {
      this.disabledReason = 'RAG_ENABLED=false';
      this.logger.log('RAG disabled via RAG_ENABLED=false');
      return;
    }
    if (this.store.name === 'noop') {
      this.disabledReason = 'no vector store configured';
      this.logger.warn(
        'RAG has no vector store (QDRANT_URL unset): analyses will contain no market evidence.',
      );
      return;
    }

    const expected = this.embeddings.dimensions;
    try {
      const info = await this.store.describe();
      if (!info.exists) {
        this.disabledReason = 'collection missing';
        this.logger.warn(
          `RAG collection "${this.config.get('QDRANT_COLLECTION')}" does not exist. Run "npm run rag:ingest" to build it; until then analyses carry no market evidence.`,
        );
        return;
      }
      if (info.dimensions && expected && info.dimensions !== expected) {
        this.disabledReason = `dimension mismatch (collection=${info.dimensions}, ${this.embeddings.providerName}=${expected})`;
        this.logger.error(
          `RAG collection was built with ${info.dimensions}-dimensional vectors but ${this.embeddings.providerName} produces ${expected}. Retrieval is disabled — re-ingest with the current provider or restore the previous RAG_EMBEDDING_PROVIDER.`,
        );
        return;
      }
      if (
        info.embeddingProvider &&
        info.embeddingProvider !== this.embeddings.providerName
      ) {
        this.disabledReason = `provider mismatch (collection=${info.embeddingProvider}, query=${this.embeddings.providerName})`;
        this.logger.error(
          `RAG collection was ingested with "${info.embeddingProvider}" but queries use "${this.embeddings.providerName}". Retrieval is disabled — re-run "npm run rag:ingest" with the current provider.`,
        );
        return;
      }
      if (!info.pointCount) {
        this.logger.warn(
          `RAG collection "${this.config.get('QDRANT_COLLECTION')}" exists but is empty. Run "npm run rag:ingest".`,
        );
        return;
      }
      this.logger.log(
        `RAG ready: ${info.pointCount} points, dim=${info.dimensions ?? expected}, embeddings=${this.embeddings.providerName}`,
      );
    } catch (err) {
      if (isQdrantAuthError(err)) {
        this.disabledReason = 'qdrant unauthorized';
        this.logger.error(
          'Qdrant rejected the connection (401/403). Set QDRANT_API_KEY for Qdrant Cloud, or point QDRANT_URL at an unauthenticated local instance.',
        );
        return;
      }
      // An unreachable Qdrant is not fatal — retrieval degrades per request.
      this.logger.warn(
        `Could not inspect the RAG collection: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  buildResumeContext(args: {
    role?: string;
    resume: string;
  }): Promise<RagContext> {
    const query = [args.role, args.resume.slice(0, 2_000)]
      .filter(Boolean)
      .join('\n');
    return this.buildContext(query);
  }

  buildJobMatchContext(args: {
    role?: string;
    resume: string;
    jobDescription: string;
  }): Promise<RagContext> {
    const query = [args.role, args.jobDescription, args.resume.slice(0, 1_500)]
      .filter(Boolean)
      .join('\n');
    return this.buildContext(query);
  }

  private async buildContext(query: string): Promise<RagContext> {
    if (!this.config.get('RAG_ENABLED') || this.store.name === 'noop') {
      return emptyContext();
    }
    if (this.disabledReason) {
      this.logger.debug(
        `RAG retrieval skipped: ${this.disabledReason}. Returning empty context.`,
      );
      return emptyContext();
    }

    try {
      const vector = await this.embeddings.embedText(query);
      if (!vector.length) return emptyContext();
      const hits = await this.store.search(vector, 8);
      if (!hits.length) {
        this.logger.debug(
          'RAG retrieval returned no hits for this query (corpus is populated).',
        );
        return emptyContext();
      }
      if (this.hasProviderMismatch(hits)) return emptyContext();

      const marketSignals = hits
        .slice(0, 6)
        .map((h) => `${h.skill} is expected for ${h.role}: ${h.evidence}`);
      const priorityGaps = hits
        .filter((h) => h.importance === 'core')
        .slice(0, 6)
        .map((h) => h.skill);
      const citations = [
        ...new Set(hits.map((h) => `${h.sourceName} (${h.sourceUrl})`)),
      ].slice(0, 4);
      const promptContext = [
        'RAG EVIDENCE: skill expectations from the labor-market corpus',
        ...hits.map(
          (h) =>
            `- ${h.role} / ${h.skill} (${h.importance}): ${h.evidence} [${h.sourceName}]`,
        ),
      ].join('\n');

      return { promptContext, marketSignals, priorityGaps, citations };
    } catch (err) {
      if (isQdrantAuthError(err)) {
        this.disabledReason = 'qdrant unauthorized';
        this.logger.error(
          'Qdrant rejected retrieval (401/403). Set QDRANT_API_KEY for Qdrant Cloud. Skipping further RAG calls this process.',
        );
        return emptyContext();
      }
      this.logger.warn(
        `RAG retrieval failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return emptyContext();
    }
  }

  /**
   * Vectors from a different embedding provider still return neighbours, they
   * are just unrelated to the query — so this is treated as no evidence at all.
   */
  private hasProviderMismatch(hits: RagEvidence[]): boolean {
    const ingested = hits.find((h) => h.embeddingProvider)?.embeddingProvider;
    if (!ingested || ingested === this.embeddings.providerName) return false;
    if (!this.providerMismatchLogged) {
      this.providerMismatchLogged = true;
      this.logger.error(
        `RAG corpus was ingested with "${ingested}" but queries use "${this.embeddings.providerName}". Discarding results — re-run "npm run rag:ingest" with the current provider.`,
      );
    }
    return true;
  }
}

function isQdrantAuthError(err: unknown): boolean {
  const status =
    typeof err === 'object' && err && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : undefined;
  if (status === 401 || status === 403) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /forbidden|unauthorized|\b401\b|\b403\b/i.test(msg);
}

function emptyContext(): RagContext {
  return {
    promptContext: '',
    marketSignals: [],
    priorityGaps: [],
    citations: [],
  };
}
