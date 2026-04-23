import { z } from 'zod';

/**
 * Environment schema. Parsed once at boot by `validateEnv()` — if invalid,
 * the process fails fast with a readable error.
 */
export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().default('api'),

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .describe('Comma-separated list of allowed origins'),

  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(30),

  LOG_LEVEL: z
    .enum(['error', 'warn', 'log', 'debug', 'verbose'])
    .default('log'),

  /**
   * LLM provider selection.
   * - `openai` requires OPENAI_API_KEY.
   * - `gemini` requires GEMINI_API_KEY.
   * - `mock` returns deterministic fake responses (good for dev/tests).
   */
  LLM_PROVIDER: z.enum(['openai', 'gemini', 'mock']).default('mock'),
  /** Empty string in .env is treated as unset. */
  OPENAI_API_KEY: z.preprocess(
    (v) =>
      v == null || v === '' || (typeof v === 'string' && v.trim() === '')
        ? undefined
        : v,
    z.string().min(1).optional(),
  ),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  /** Chat completion cap for JSON resume/match output (avoids empty/truncated JSON 503s). */
  OPENAI_MAX_COMPLETION_TOKENS: z.coerce
    .number()
    .int()
    .min(1024)
    .max(16384)
    .default(8192),
  GEMINI_API_KEY: z.preprocess(
    (v) =>
      v == null || v === '' || (typeof v === 'string' && v.trim() === '')
        ? undefined
        : v,
    z.string().min(1).optional(),
  ),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  GEMINI_EMBEDDING_DIMENSIONS: z.coerce
    .number()
    .int()
    .min(128)
    .max(3072)
    .default(768),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  RAG_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  /**
   * How to produce query/ingest vectors. `openai` uses text-embedding-3-* (match
   * OPENAI_EMBEDDING_* to your Pinecone index dimension). `gemini` uses GEMINI_*.
   */
  RAG_EMBEDDING_PROVIDER: z.enum(['openai', 'gemini']).default('openai'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-large'),
  OPENAI_EMBEDDING_DIMENSIONS: z.coerce
    .number()
    .int()
    .min(256)
    .max(3072)
    .default(3072),
  PINECONE_API_KEY: z.string().min(1).optional(),
  /** Index name in Pinecone (e.g. copilot-job). */
  PINECONE_INDEX: z.string().default('copilot-job'),
  /**
   * Optional data-plane host from the index details in the Pinecone console,
   * e.g. https://copilot-job-xxxx.svc.region.pinecone.io — speeds up targeting
   * and matches serverless indexes.
   */
  PINECONE_HOST: z.preprocess(
    (v) =>
      v == null || v === '' || (typeof v === 'string' && v.trim() === '')
        ? undefined
        : v,
    z.string().min(1).optional(),
  ),
  PINECONE_NAMESPACE: z.string().default('public-jobs'),
  PINECONE_TOP_K: z.coerce.number().int().min(1).max(50).default(8),
  /** Cosine similarity floor for matches; lower if small seeds return no hits (e.g. 0.35–0.45). */
  PINECONE_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.45),
});

export type Env = z.infer<typeof EnvSchema>;
