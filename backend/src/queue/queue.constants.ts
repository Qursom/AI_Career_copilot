export const RESUME_ANALYSIS_QUEUE = 'resume-analysis';

/**
 * Public job id is `${userId}__${requestId}` so idempotency keys cannot collide
 * across users. BullMQ forbids `:` in custom ids (it is the Redis key separator).
 */
export function resumeJobId(userId: string, requestId: string): string {
  return `${userId}__${requestId}`;
}
