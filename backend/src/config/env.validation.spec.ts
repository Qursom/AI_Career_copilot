import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const base = {
    NODE_ENV: 'test',
    LLM_PROVIDER: 'mock',
    RAG_ENABLED: 'true',
    RAG_EMBEDDING_PROVIDER: 'mock',
  };

  it('accepts mock embeddings without an API key', () => {
    expect(() => validateEnv(base)).not.toThrow();
  });

  it('leaves the resume queue off unless RESUME_QUEUE_ENABLED=true', () => {
    expect(validateEnv(base).RESUME_QUEUE_ENABLED).toBe(false);
    expect(
      validateEnv({ ...base, RESUME_QUEUE_ENABLED: 'true' }).RESUME_QUEUE_ENABLED,
    ).toBe(true);
  });

  it('rejects the unimplemented openai LLM provider', () => {
    expect(() =>
      validateEnv({ ...base, LLM_PROVIDER: 'openai' }),
    ).toThrow(/Invalid environment configuration/);
  });

  it('rejects gemini embeddings when GEMINI_API_KEY is missing', () => {
    expect(() =>
      validateEnv({
        ...base,
        RAG_EMBEDDING_PROVIDER: 'gemini',
      }),
    ).toThrow(/RAG_EMBEDDING_PROVIDER=gemini requires GEMINI_API_KEY/);
  });

  it('accepts gemini embeddings when a key is present', () => {
    expect(() =>
      validateEnv({
        ...base,
        RAG_EMBEDDING_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-key',
      }),
    ).not.toThrow();
  });

  it('refuses production without Mongo, Redis, and Firebase', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        LLM_PROVIDER: 'groq',
        GROQ_API_KEY: 'gsk_test',
      }),
    ).toThrow(/Production requires durable sessions/);
  });

  it('accepts production when durable deps and a real LLM are set', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        LLM_PROVIDER: 'groq',
        GROQ_API_KEY: 'gsk_test',
        MONGODB_URI: 'mongodb://localhost:27017/career_copilot',
        REDIS_URL: 'redis://localhost:6379',
        FIREBASE_PROJECT_ID: 'demo',
        FIREBASE_CLIENT_EMAIL: 'sa@demo.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nM\\n-----END PRIVATE KEY-----\\n',
        CORS_ORIGIN: 'https://app.example.com',
      }),
    ).not.toThrow();
  });

  it('refuses AUTH_DEV_BYPASS in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        LLM_PROVIDER: 'groq',
        GROQ_API_KEY: 'gsk_test',
        MONGODB_URI: 'mongodb://localhost:27017/x',
        REDIS_URL: 'redis://localhost:6379',
        FIREBASE_PROJECT_ID: 'demo',
        FIREBASE_CLIENT_EMAIL: 'sa@demo.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY: 'key',
        AUTH_DEV_BYPASS: 'true',
      }),
    ).toThrow(/AUTH_DEV_BYPASS/);
  });
});
