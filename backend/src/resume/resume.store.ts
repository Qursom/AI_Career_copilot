import type { ResumeAnalysis } from './resume.schema';

export const RESUME_STORE = Symbol('RESUME_STORE');

export interface ResumeStore {
  upsert(userId: string, analysis: ResumeAnalysis): Promise<ResumeAnalysis>;
  findByUserId(userId: string): Promise<ResumeAnalysis | null>;
}
