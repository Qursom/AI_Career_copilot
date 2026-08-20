import { Inject, Injectable, Logger } from '@nestjs/common';
import { TypedConfigService } from '../../config/typed-config.service';
import { COMPARISON_CORPUS_SEED } from '../data/comparison-corpus.seed';
import { ADJACENT_ROLES_SEED } from '../data/adjacent-roles.seed';
import { PUBLIC_ROLE_SKILLS_SEED } from '../data/public-role-skills.seed';
import { EmbeddingService } from '../embeddings/embedding.service';
import { RAG_VECTOR_STORE } from '../rag.tokens';
import type { PublicSkillRecord } from '../rag.types';
import type { VectorStore } from '../vector/vector-store.interface';

@Injectable()
export class RagIngestionService {
  private readonly logger = new Logger(RagIngestionService.name);

  constructor(
    private readonly embeddings: EmbeddingService,
    @Inject(RAG_VECTOR_STORE) private readonly store: VectorStore,
    private readonly config: TypedConfigService,
  ) {}

  async ingestPublicDatasets(): Promise<{
    processed: number;
    upserted: number;
  }> {
    const normalized = this.normalizeRecords([
      ...PUBLIC_ROLE_SKILLS_SEED,
      ...COMPARISON_CORPUS_SEED,
      ...ADJACENT_ROLES_SEED,
    ]);

    if (this.store.name === 'noop') {
      this.logger.log(
        `No vector store configured, skipping RAG ingestion (would process ${normalized.length} records).`,
      );
      return { processed: 0, upserted: 0 };
    }

    // The collection is created from the provider's own width, so ingest and
    // query cannot disagree about dimensions.
    const dim = this.embeddings.dimensions;
    await this.store.ensureCollection(dim);

    const existing = await this.store.describe();
    if (existing.exists && existing.dimensions && existing.dimensions !== dim) {
      throw new Error(
        `Collection "${this.config.get('QDRANT_COLLECTION')}" holds ${existing.dimensions}-dimensional vectors but ${this.embeddings.providerName} produces ${dim}. Delete the collection or switch RAG_EMBEDDING_PROVIDER back before re-ingesting.`,
      );
    }
    if (
      existing.exists &&
      existing.embeddingProvider &&
      existing.embeddingProvider !== this.embeddings.providerName
    ) {
      throw new Error(
        `Collection "${this.config.get('QDRANT_COLLECTION')}" was ingested with "${existing.embeddingProvider}" but the current provider is "${this.embeddings.providerName}". Delete the collection or switch RAG_EMBEDDING_PROVIDER back before re-ingesting.`,
      );
    }

    const points = [];
    for (const record of normalized) {
      const text = `${record.role}\n${record.skill}\n${record.evidence}`;
      const vector = await this.embeddings.embedText(text);
      if (!vector.length) continue;
      points.push({
        id: record.id,
        vector,
        payload: {
          role: record.role,
          skill: record.skill,
          importance: record.importance,
          evidence: record.evidence,
          sourceName: record.sourceName,
          sourceUrl: record.sourceUrl,
          seniority: record.seniority ?? '',
          embeddingProvider: this.embeddings.providerName,
        },
      });
    }

    const upserted = await this.store.upsert(points);
    await this.store.writeCorpusMeta({
      embeddingProvider: this.embeddings.providerName,
      dimensions: dim,
    });
    this.logger.log(
      `Ingested ${upserted} records into ${this.store.name} (embeddings=${this.embeddings.providerName}, dim=${dim})`,
    );
    return { processed: normalized.length, upserted };
  }

  normalizeRecords(records: PublicSkillRecord[]): PublicSkillRecord[] {
    return records
      .map((record) => ({
        ...record,
        role: record.role.trim(),
        skill: record.skill.trim(),
        evidence: record.evidence.trim(),
        sourceName: record.sourceName.trim(),
        sourceUrl: record.sourceUrl.trim(),
      }))
      .filter(
        (record) =>
          !!record.id &&
          !!record.role &&
          !!record.skill &&
          !!record.evidence &&
          !!record.sourceName &&
          !!record.sourceUrl,
      );
  }
}
