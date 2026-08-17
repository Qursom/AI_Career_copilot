import { Inject, Injectable, Logger } from '@nestjs/common';
import { TypedConfigService } from '../../config/typed-config.service';
import { COMPARISON_CORPUS_SEED } from '../data/comparison-corpus.seed';
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
    ]);

    if (this.store.name === 'noop') {
      this.logger.log(
        `No vector store configured, skipping RAG ingestion (would process ${normalized.length} records).`,
      );
      return { processed: 0, upserted: 0 };
    }

    const dim = this.config.get('GEMINI_EMBEDDING_DIMENSIONS');
    await this.store.ensureCollection(dim);

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
        },
      });
    }

    const upserted = await this.store.upsert(points);
    this.logger.log(`Ingested ${upserted} records into ${this.store.name}`);
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
