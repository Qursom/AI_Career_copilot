import type { ResumeAnalysis } from './resume.schema';
import type { ResumeStore } from './resume.store';

export class MemoryResumeStore implements ResumeStore {
  private readonly byUser = new Map<string, ResumeAnalysis>();

  upsert(userId: string, analysis: ResumeAnalysis): Promise<ResumeAnalysis> {
    const existing = this.byUser.get(userId);
    const next = existing ? Object.assign(existing, analysis) : analysis;
    this.byUser.set(userId, next);
    return Promise.resolve(next);
  }

  findByUserId(userId: string): Promise<ResumeAnalysis | null> {
    return Promise.resolve(this.byUser.get(userId) ?? null);
  }
}
