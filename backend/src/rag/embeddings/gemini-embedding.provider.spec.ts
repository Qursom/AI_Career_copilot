import { GeminiEmbeddingProvider } from './gemini-embedding.provider';

describe('GeminiEmbeddingProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns an empty vector for blank text without calling the API', async () => {
    global.fetch = jest.fn();
    const provider = new GeminiEmbeddingProvider({
      apiKey: 'k',
      model: 'gemini-embedding-001',
      outputDimensionality: 1536,
    });
    await expect(provider.embedText('  ')).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards outputDimensionality and rejects a width mismatch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: [0.1, 0.2] } }),
    });
    const provider = new GeminiEmbeddingProvider({
      apiKey: 'k',
      model: 'gemini-embedding-001',
      outputDimensionality: 1536,
    });

    await expect(provider.embedText('hello')).rejects.toThrow(/width 2/);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      { body: string },
    ];
    expect(JSON.parse(init.body).outputDimensionality).toBe(1536);
  });
});
