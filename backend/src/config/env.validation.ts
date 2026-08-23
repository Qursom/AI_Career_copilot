import { EnvSchema, type Env } from './env.schema';
import { hasUpstashRest, resolveRedisUrl } from './redis-url';

/**
 * Used by `@nestjs/config`'s `validate` option. Runs once at boot.
 * Throws with a human-readable message if env is invalid.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const merged: Record<string, unknown> = { ...raw };
  const redisUrl = resolveRedisUrl(merged);
  if (redisUrl) {
    merged.REDIS_URL = redisUrl;
  }

  const parsed = EnvSchema.safeParse(merged);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  if (parsed.data.LLM_PROVIDER === 'gemini' && !parsed.data.GEMINI_API_KEY) {
    throw new Error('LLM_PROVIDER=gemini requires GEMINI_API_KEY to be set.');
  }
  if (parsed.data.LLM_PROVIDER === 'groq' && !parsed.data.GROQ_API_KEY) {
    throw new Error('LLM_PROVIDER=groq requires GROQ_API_KEY to be set.');
  }
  if (
    parsed.data.RAG_ENABLED &&
    parsed.data.RAG_EMBEDDING_PROVIDER === 'gemini' &&
    !parsed.data.GEMINI_API_KEY
  ) {
    throw new Error(
      'RAG_EMBEDDING_PROVIDER=gemini requires GEMINI_API_KEY. Set the key, or set RAG_EMBEDDING_PROVIDER=mock and re-run "npm run rag:ingest".',
    );
  }

  if (parsed.data.NODE_ENV === 'production') {
    assertProductionReady(parsed.data);
  }

  return parsed.data;
}

function hasFirebaseAdmin(env: Env): boolean {
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) return true;
  return Boolean(
    env.FIREBASE_PROJECT_ID &&
      env.FIREBASE_CLIENT_EMAIL &&
      env.FIREBASE_PRIVATE_KEY,
  );
}

function assertProductionReady(env: Env): void {
  const missing: string[] = [];
  if (!env.MONGODB_URI) missing.push('MONGODB_URI');
  if (!env.REDIS_URL && !hasUpstashRest(env)) {
    missing.push('UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN');
  }
  if (!hasFirebaseAdmin(env)) {
    missing.push(
      'Firebase Admin (FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)',
    );
  }
  if (missing.length > 0) {
    throw new Error(
      `Production requires durable sessions and identity. Missing:\n  • ${missing.join('\n  • ')}`,
    );
  }
  if (env.AUTH_DEV_BYPASS) {
    throw new Error(
      'AUTH_DEV_BYPASS cannot be true in production (arbitrary account impersonation).',
    );
  }
  if (env.LLM_PROVIDER === 'mock' && !env.ALLOW_MOCK_LLM) {
    throw new Error(
      'LLM_PROVIDER=mock is not allowed in production. Set groq or gemini, or set ALLOW_MOCK_LLM=true for a staging deploy.',
    );
  }
  if (env.CORS_ORIGIN.split(',').some((o) => o.trim() === '*')) {
    throw new Error(
      'CORS_ORIGIN cannot include * in production (credentialed session cookies).',
    );
  }
  if (env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error(
      'STRIPE_SECRET_KEY requires STRIPE_WEBHOOK_SECRET so paid coins cannot be forged.',
    );
  }
  if (env.STRIPE_SECRET_KEY && !env.STRIPE_COIN_PACKS) {
    throw new Error(
      'STRIPE_SECRET_KEY requires STRIPE_COIN_PACKS (id:priceId:coins,...).',
    );
  }
}
