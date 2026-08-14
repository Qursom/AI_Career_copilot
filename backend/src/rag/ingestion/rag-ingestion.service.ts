import { Injectable, Logger } from '@nestjs/common';
import { COMPARISON_CORPUS_SEED } from '../data/comparison-corpus.seed';
import { PUBLIC_ROLE_SKILLS_SEED } from '../data/public-role-skills.seed';
import type { PublicSkillRecord } from '../rag.types';

@Injectable()
export class RagIngestionService {
  private readonly logger = new Logger(RagIngestionService.name);

  ingestPublicDatasets(): Promise<{
    processed: number;
    upserted: number;
  }> {
    const normalized = this.normalizeRecords([
      ...PUBLIC_ROLE_SKILLS_SEED,
      ...COMPARISON_CORPUS_SEED,
    ]);
    this.logger.log(
      `No vector store configured, skipping RAG ingestion (would process ${normalized.length} records).`,
    );
    return Promise.resolve({ processed: 0, upserted: 0 });
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
