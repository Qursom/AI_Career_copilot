import { z } from 'zod';

const emptyToUndef = (v: unknown) =>
  v == null || v === '' || (typeof v === 'string' && v.trim() === '')
    ? undefined
    : v;

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
   * - `groq` requires GROQ_API_KEY (LangChain ChatGroq).
   * - `mock` returns deterministic fake responses (good for dev/tests).
   */
  LLM_PROVIDER: z.enum(['gemini', 'groq', 'mock', 'openai']).default('mock'),
  GEMINI_API_KEY: z.preprocess(
    emptyToUndef,
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
  GROQ_API_KEY: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  RAG_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  RAG_EMBEDDING_PROVIDER: z
    .enum(['gemini', 'mock', 'openai'])
    .default('gemini'),
  OPENAI_API_KEY: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),

  MONGODB_URI: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  REDIS_URL: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  REDIS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(7 * 24 * 60 * 60),

  QDRANT_URL: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  QDRANT_COLLECTION: z.string().default('career_copilot_skills'),

  FIREBASE_SERVICE_ACCOUNT_PATH: z.preprocess(
    emptyToUndef,
    z.string().min(1).optional(),
  ),
  FIREBASE_PROJECT_ID: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  FIREBASE_CLIENT_EMAIL: z.preprocess(
    emptyToUndef,
    z.string().min(1).optional(),
  ),
  FIREBASE_PRIVATE_KEY: z.preprocess(emptyToUndef, z.string().min(1).optional()),

  RESUME_COIN_COST: z.coerce.number().int().positive().default(10),
  USER_STARTING_COINS: z.coerce.number().int().nonnegative().default(100),
});

export type Env = z.infer<typeof EnvSchema>;
