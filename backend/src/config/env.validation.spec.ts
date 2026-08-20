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
});
