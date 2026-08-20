import type { MatchResult } from './job-match.schema';

export const JOB_MATCH_STORE = Symbol('JOB_MATCH_STORE');

export interface JobMatchStored {
  userId: string;
  contentHash: string;
  result: MatchResult;
  jobPreview: string;
  createdAt: Date;
}

export interface JobMatchStore {
  upsert(record: JobMatchStored): Promise<JobMatchStored>;
  findByUserAndHash(
    userId: string,
    contentHash: string,
  ): Promise<JobMatchStored | null>;
  findLatestByUserId(userId: string): Promise<JobMatchStored | null>;
  listByUserId(userId: string, limit?: number): Promise<JobMatchStored[]>;
}
