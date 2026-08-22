import type { JobMatchStore, JobMatchStored } from './job-match.store';

export class MemoryJobMatchStore implements JobMatchStore {
  private readonly byHash = new Map<string, JobMatchStored>();
  private readonly byUser = new Map<string, JobMatchStored[]>();

  private key(userId: string, contentHash: string): string {
    return `${userId}:${contentHash}`;
  }

  upsert(record: JobMatchStored): Promise<JobMatchStored> {
    const stored: JobMatchStored = {
      ...record,
      jobDescription: record.jobDescription ?? '',
      resume: record.resume ?? '',
      createdAt: record.createdAt ?? new Date(),
    };
    this.byHash.set(this.key(stored.userId, stored.contentHash), stored);
    const list = this.byUser.get(stored.userId) ?? [];
    const idx = list.findIndex((row) => row.contentHash === stored.contentHash);
    if (idx >= 0) {
      list[idx] = stored;
    } else {
      list.unshift(stored);
    }
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    this.byUser.set(stored.userId, list);
    return Promise.resolve(stored);
  }

  findByUserAndHash(
    userId: string,
    contentHash: string,
  ): Promise<JobMatchStored | null> {
    return Promise.resolve(this.byHash.get(this.key(userId, contentHash)) ?? null);
  }

  findLatestByUserId(userId: string): Promise<JobMatchStored | null> {
    return Promise.resolve(this.byUser.get(userId)?.[0] ?? null);
  }

  listByUserId(userId: string, limit = 20): Promise<JobMatchStored[]> {
    return Promise.resolve((this.byUser.get(userId) ?? []).slice(0, limit));
  }
}
