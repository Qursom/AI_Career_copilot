import { hasUpstashRest, resolveRedisUrl } from './redis-url';

describe('resolveRedisUrl', () => {
  it('prefers REDIS_URL for the Redis protocol client', () => {
    expect(
      resolveRedisUrl({
        REDIS_URL: 'redis://localhost:6379',
        UPSTASH_REDIS_URL: 'rediss://default:x@x.upstash.io:6379',
      }),
    ).toBe('redis://localhost:6379');
  });

  it('accepts UPSTASH_REDIS_URL for BullMQ', () => {
    expect(
      resolveRedisUrl({
        UPSTASH_REDIS_URL: 'rediss://default:secret@ready-slug.upstash.io:6379',
      }),
    ).toBe('rediss://default:secret@ready-slug.upstash.io:6379');
  });

  it('upgrades redis:// Upstash hosts to rediss://', () => {
    expect(
      resolveRedisUrl({
        REDIS_URL: 'redis://default:secret@ready-slug.upstash.io:6379',
      }),
    ).toBe('rediss://default:secret@ready-slug.upstash.io:6379');
  });

  it('does not treat REST URL as a protocol Redis URL', () => {
    expect(
      resolveRedisUrl({
        UPSTASH_REDIS_REST_URL: 'https://ready-slug.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'token',
      }),
    ).toBeUndefined();
  });
});

describe('hasUpstashRest', () => {
  it('requires both REST url and token', () => {
    expect(hasUpstashRest({})).toBe(false);
    expect(
      hasUpstashRest({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io' }),
    ).toBe(false);
    expect(
      hasUpstashRest({
        UPSTASH_REDIS_REST_URL: 'https://x.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'token',
      }),
    ).toBe(true);
  });
});
