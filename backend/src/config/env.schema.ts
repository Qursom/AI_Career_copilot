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
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
});

export type Env = z.infer<typeof EnvSchema>;
