import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from '../embeddings/embedding.service';
import { COMPARISON_CORPUS_SEED } from '../data/comparison-corpus.seed';
import { PUBLIC_ROLE_SKILLS_SEED } from '../data/public-role-skills.seed';
import type { PublicSkillRecord } from '../rag.types';
import {
  PineconeVectorStore,
  type UpsertRagVector,
} from '../vector/pinecone-vector.store';

@Injectable()
export class RagIngestionService {
  private readonly logger = new Logger(RagIngestionService.name);

  constructor(
    private readonly embeddings: EmbeddingService,
    private readonly vectors: PineconeVectorStore,
  ) {}

  async ingestPublicDatasets(): Promise<{
    processed: number;
    upserted: number;
  }> {
    const normalized = this.normalizeRecords([
      ...PUBLIC_ROLE_SKILLS_SEED,
      ...COMPARISON_CORPUS_SEED,
    ]);
    const vectors: UpsertRagVector[] = [];

    for (const record of normalized) {
      const values = await this.embeddings.embedText(
        this.toEmbeddingText(record),
      );
      if (values.length === 0) continue;

      vectors.push({
        id: record.id,
        values,
        metadata: {
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

    const upserted = await this.vectors.upsert(vectors);
    this.logger.log(
      `RAG ingestion complete: processed=${normalized.length}, upserted=${upserted}`,
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

  private toEmbeddingText(record: PublicSkillRecord): string {
    return [
      `Role: ${record.role}`,
      `Skill: ${record.skill}`,
      `Importance: ${record.importance}`,
      `Evidence: ${record.evidence}`,
      `Source: ${record.sourceName}`,
      record.seniority ? `Seniority: ${record.seniority}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}
