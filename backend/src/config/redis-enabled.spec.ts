import {
  isRedisConfigured,
  isResumeQueueEnabled,
  isResumeQueueWorkerEnabled,
} from './redis-enabled';

describe('isRedisConfigured', () => {
  it('is false for empty, none, and disabled', () => {
    expect(isRedisConfigured('')).toBe(false);
    expect(isRedisConfigured('none')).toBe(false);
    expect(isRedisConfigured('disabled')).toBe(false);
    expect(isRedisConfigured(undefined)).toBe(false);
  });

  it('is true for a redis URL', () => {
    expect(isRedisConfigured('redis://localhost:6379')).toBe(true);
  });
});

describe('isResumeQueueEnabled', () => {
  const redis = 'redis://localhost:6379';

  it('is off by default even when Redis is set', () => {
    expect(isResumeQueueEnabled(undefined, redis)).toBe(false);
    expect(isResumeQueueEnabled('', redis)).toBe(false);
    expect(isResumeQueueEnabled('false', redis)).toBe(false);
  });

  it('is on only when Redis is set and the flag is true', () => {
    expect(isResumeQueueEnabled('true', redis)).toBe(true);
    expect(isResumeQueueEnabled('true', '')).toBe(false);
    expect(isResumeQueueEnabled('true', undefined)).toBe(false);
  });
});

describe('isResumeQueueWorkerEnabled', () => {
  it('defaults to true unless explicitly false', () => {
    expect(isResumeQueueWorkerEnabled(undefined)).toBe(true);
    expect(isResumeQueueWorkerEnabled('true')).toBe(true);
    expect(isResumeQueueWorkerEnabled('false')).toBe(false);
  });
});
