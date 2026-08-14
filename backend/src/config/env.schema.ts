import { z } from 'zod';

const optionalString = z.preprocess((v) => v == null || (typeof v === 'string' && v.trim() === '') ? undefined : v, z.string().min(1).optional());

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().default('api'),
  CORS_ORIGIN: z.string().default('http://localhost:3000').describe('Comma-separated list of allowed origins'),
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(30),
  LOG_LEVEL: z.enum(['error','warn','log','debug','verbose']).default('log'),
  LLM_PROVIDER: z.enum(['gemini','openai','mock']).default('mock'),
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: z.string().default('gpt-5.4-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  RAG_ENABLED: z.enum(['true','false']).default('true').transform(v => v === 'true'),
  RAG_EMBEDDING_PROVIDER: z.enum(['gemini','openai']).default('gemini'),
  PINECONE_API_KEY: optionalString,
  PINECONE_INDEX: optionalString,
  RAG_TOP_K: z.coerce.number().int().min(1).max(20).default(8),
  RAG_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.35),
  RAG_MAX_CHARS_PER_DOC: z.coerce.number().int().min(100).max(8000).default(2500),
});

export type Env = z.infer<typeof EnvSchema>;
