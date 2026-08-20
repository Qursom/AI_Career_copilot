import { HttpException, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { ResumeAnalysisService } from '../resume/resume-analysis.service';
import { RESUME_ANALYSIS_QUEUE } from './queue.constants';
import type { ResumeJobData } from './resume-job.types';
import type { ResumeAnalysisResult } from '../resume/resume-analysis.service';

@Processor(RESUME_ANALYSIS_QUEUE)
export class ResumeAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumeAnalysisProcessor.name);

  constructor(private readonly analysis: ResumeAnalysisService) {
    super();
  }

  async process(
    job: Job<ResumeJobData, ResumeAnalysisResult>,
  ): Promise<ResumeAnalysisResult> {
    this.logger.log(
      `resume_job_started jobId=${job.id} userId=${job.data.userId} requestId=${job.data.requestId}`,
    );
    await job.updateProgress({ step: 'running', percent: 10 });
    try {
      const result = await this.analysis.execute(job.data);
      await job.updateProgress({ step: 'completed', percent: 100 });
      this.logger.log(
        `resume_job_completed jobId=${job.id} userId=${job.data.userId} requestId=${job.data.requestId}`,
      );
      return result;
    } catch (err) {
      const payload = jobErrorFromUnknown(err);
      this.logger.warn(
        `resume_job_failed jobId=${job.id} userId=${job.data.userId} code=${payload.code}`,
      );
      throw new UnrecoverableError(JSON.stringify(payload));
    }
  }
}

export function jobErrorFromUnknown(err: unknown): {
  code: string;
  message: string;
} {
  if (err instanceof HttpException) {
    const resp = err.getResponse();
    if (typeof resp === 'string') {
      return { code: 'LLM_ERROR', message: resp };
    }
    if (resp && typeof resp === 'object') {
      const r = resp as Record<string, unknown>;
      return {
        code: typeof r.error === 'string' ? r.error : 'LLM_ERROR',
        message:
          typeof r.message === 'string' ? r.message : err.message,
      };
    }
    return { code: 'LLM_ERROR', message: err.message };
  }
  return {
    code: 'LLM_ERROR',
    message: err instanceof Error ? err.message : String(err),
  };
}
