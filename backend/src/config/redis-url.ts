/**
 * Cache/sessions: prefer Upstash REST (`UPSTASH_REDIS_REST_URL` + token).
 * BullMQ still needs a Redis protocol URL (`REDIS_URL` / `UPSTASH_REDIS_URL`).
 */
export function resolveRedisUrl(raw: Record<string, unknown>): string | undefined {
  const redis =
    nonempty(raw.REDIS_URL) ??
    nonempty(raw.UPSTASH_REDIS_URL) ??
    nonempty(raw.UPSTASH_REDIS_TLS_URL);

  if (!redis) return undefined;
  if (/^https?:\/\//i.test(redis)) {
    throw new Error(
      'REDIS_URL must be redis:// or rediss://. Put the HTTP endpoint in UPSTASH_REDIS_REST_URL instead.',
    );
  }
  return forceUpstashTls(redis);
}

export function hasUpstashRest(raw: {
  UPSTASH_REDIS_REST_URL?: string | undefined;
  UPSTASH_REDIS_REST_TOKEN?: string | undefined;
}): boolean {
  return Boolean(
    nonempty(raw.UPSTASH_REDIS_REST_URL) &&
      nonempty(raw.UPSTASH_REDIS_REST_TOKEN),
  );
}

function nonempty(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'none' ||
    trimmed.toLowerCase() === 'disabled'
  ) {
    return undefined;
  }
  return trimmed;
}

function forceUpstashTls(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.endsWith('.upstash.io') &&
      parsed.protocol === 'redis:'
    ) {
      parsed.protocol = 'rediss:';
      return parsed.toString();
    }
  } catch {
    return url;
  }
  return url;
}
