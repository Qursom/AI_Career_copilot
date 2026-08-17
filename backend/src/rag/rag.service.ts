import { Inject, Injectable, Logger } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { EmbeddingService } from './embeddings/embedding.service';
import { RAG_VECTOR_STORE } from './rag.tokens';
import type { RagContext } from './rag.types';
import type { VectorStore } from './vector/vector-store.interface';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly config: TypedConfigService,
    private readonly embeddings: EmbeddingService,
    @Inject(RAG_VECTOR_STORE) private readonly store: VectorStore,
  ) {}

  buildResumeContext(args: {
    role?: string;
    resume: string;
  }): Promise<RagContext> {
    const query = [args.role, args.resume.slice(0, 2_000)].filter(Boolean).join('\n');
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

    try {
      const vector = await this.embeddings.embedText(query);
      if (!vector.length) return emptyContext();
      const hits = await this.store.search(vector, 8);
      if (!hits.length) return emptyContext();

      const marketSignals = hits.slice(0, 6).map(
        (h) => `${h.skill} is expected for ${h.role}: ${h.evidence}`,
      );
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
      this.logger.warn(
        `RAG retrieval failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return emptyContext();
    }
  }
}

function emptyContext(): RagContext {
  return {
    promptContext: '',
    marketSignals: [],
    priorityGaps: [],
    citations: [],
  };
}
