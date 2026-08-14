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
   * - `gemini` requires GEMINI_API_KEY.
   * - `mock` returns deterministic fake responses (good for dev/tests).
   */
  LLM_PROVIDER: z.enum(['gemini', 'mock']).default('mock'),
  /** Empty string in .env is treated as unset. */
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
   * How to produce query/ingest vectors when a store is wired.
   * Retrieval currently returns empty context (no vector store).
   */
  RAG_EMBEDDING_PROVIDER: z.enum(['gemini']).default('gemini'),
});

export type Env = z.infer<typeof EnvSchema>;
