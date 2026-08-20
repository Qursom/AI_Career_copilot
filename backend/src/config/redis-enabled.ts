/** True when a Redis URL is configured for cache and sessions. */
export function isRedisConfigured(
  uri: string | undefined | null = process.env.REDIS_URL,
): boolean {
  const value = uri?.trim().toLowerCase();
  if (!value || value === 'none' || value === 'disabled') {
    return false;
  }
  return true;
}

function flagTrue(value: string | undefined | null): boolean {
  return value?.trim().toLowerCase() === 'true';
}

/**
 * BullMQ for resume analysis is opt-in. Redis can still run cache/sessions
 * while analysis stays inline (HTTP 200) until this is true.
 */
export function isResumeQueueEnabled(
  enabled: string | undefined | null = process.env.RESUME_QUEUE_ENABLED,
  redisUrl: string | undefined | null = process.env.REDIS_URL,
): boolean {
  return isRedisConfigured(redisUrl) && flagTrue(enabled);
}

/** When the queue is on, this process runs the worker unless set to false. */
export function isResumeQueueWorkerEnabled(
  worker: string | undefined | null = process.env.RESUME_QUEUE_WORKER,
): boolean {
  const value = worker?.trim().toLowerCase();
  return value !== 'false';
}
