import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, type Job } from 'bullmq';
import { RESUME_ANALYSIS_QUEUE, resumeJobId } from './queue.constants';
import type {
  ResumeJobAccepted,
  ResumeJobData,
  ResumeJobProgress,
  ResumeJobStatus,
} from './resume-job.types';
import type { ResumeAnalysisResult } from '../resume/resume-analysis.service';

const ENQUEUE_TIMEOUT_MS = 2_500;
const STATUS_TIMEOUT_MS = 2_500;

const QUEUE_DOWN = {
  message:
    'The analysis queue is unavailable (Redis did not accept the job). Start Redis, or unset REDIS_URL to run analysis synchronously.',
  error: 'QUEUE_UNAVAILABLE',
} as const;

/**
 * Thin BullMQ client. Sits beside CacheStore — sessions/cache stay on
 * CacheService; this only enqueues and reads resume-analysis jobs.
 */
@Injectable()
export class ResumeJobClient {
  private readonly logger = new Logger(ResumeJobClient.name);

  constructor(
    @InjectQueue(RESUME_ANALYSIS_QUEUE) private readonly queue: Queue,
  ) {}

  async enqueue(data: ResumeJobData): Promise<ResumeJobAccepted> {
    const jobId = resumeJobId(data.userId, data.requestId);
    try {
      const existing = await withTimeout(this.queue.getJob(jobId), ENQUEUE_TIMEOUT_MS);
      if (existing) {
        const state = await existing.getState();
        if (state === 'failed') {
          await existing.remove();
        } else {
          this.logger.log(
            `resume_job_idempotent jobId=${jobId} state=${state}`,
          );
          return { jobId, status: state === 'active' ? 'active' : 'queued' };
        }
      }

      await withTimeout(
        this.queue.add('analyze', data, {
          jobId,
          attempts: 1,
          removeOnComplete: { age: 60 * 60, count: 1_000 },
          removeOnFail: { age: 24 * 60 * 60, count: 1_000 },
        }),
        ENQUEUE_TIMEOUT_MS,
      );
      this.logger.log(
        `resume_job_enqueued userId=${data.userId} requestId=${data.requestId} jobId=${jobId}`,
      );
      return { jobId, status: 'queued' };
    } catch (err) {
      this.logger.warn(
        `resume_job_enqueue_failed jobId=${jobId} reason=${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException(QUEUE_DOWN);
    }
  }

  async getStatus(jobId: string, userId: string): Promise<ResumeJobStatus> {
    let job: Job<ResumeJobData, ResumeAnalysisResult> | undefined;
    try {
      job = await withTimeout(this.queue.getJob(jobId), STATUS_TIMEOUT_MS);
    } catch (err) {
      this.logger.warn(
        `resume_job_status_failed jobId=${jobId} reason=${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException(QUEUE_DOWN);
    }

    if (!job || job.data?.userId !== userId) {
      throw new NotFoundException({
        message: 'No resume analysis job found.',
        error: 'NOT_FOUND',
      });
    }

    const state = await job.getState();
    const progress = parseProgress(job.progress);

    if (state === 'completed') {
      return {
        jobId,
        status: 'completed',
        progress: progress ?? { step: 'completed', percent: 100 },
        result: job.returnvalue,
      };
    }

    if (state === 'failed') {
      return {
        jobId,
        status: 'failed',
        progress,
        error: parseFailedReason(job.failedReason),
      };
    }

    if (state === 'active') {
      return {
        jobId,
        status: 'active',
        progress: progress ?? { step: 'running', percent: 10 },
      };
    }

    return {
      jobId,
      status: 'queued',
      progress: progress ?? { step: 'queued', percent: 0 },
    };
  }
}

export function parseFailedReason(
  raw?: string,
): { code: string; message: string } {
  if (!raw?.trim()) {
    return {
      code: 'LLM_ERROR',
      message: 'Resume analysis failed. Please try again.',
    };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const o = parsed as { code?: unknown; message?: unknown };
      if (typeof o.code === 'string' && typeof o.message === 'string') {
        return { code: o.code, message: o.message };
      }
    }
  } catch {
    /* not JSON */
  }
  return { code: 'LLM_ERROR', message: raw.slice(0, 400) };
}

function parseProgress(raw: unknown): ResumeJobProgress | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as { step?: unknown; percent?: unknown };
  if (typeof o.step !== 'string') return undefined;
  return {
    step: o.step,
    percent: typeof o.percent === 'number' ? o.percent : 0,
  };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Redis queue call exceeded ${ms}ms`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e as Error);
      },
    );
  });
}
