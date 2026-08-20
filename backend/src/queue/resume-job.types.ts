import type { ResumeAnalysisResult } from '../resume/resume-analysis.service';

export type ResumeJobData = {
  userId: string;
  email?: string;
  filePath?: string;
  rawText?: string;
  role?: string;
  requestId: string;
};

export type ResumeJobProgress = {
  step: string;
  percent: number;
};

export type ResumeJobAccepted = {
  jobId: string;
  status: 'queued' | 'active';
};

export type ResumeJobStatus = {
  jobId: string;
  status: 'queued' | 'active' | 'completed' | 'failed';
  progress?: ResumeJobProgress;
  result?: ResumeAnalysisResult;
  error?: { code: string; message: string };
};

export function isResumeJobAccepted(
  value: unknown,
): value is ResumeJobAccepted {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.jobId === 'string' && typeof v.status === 'string' && !('atsScore' in v);
}
