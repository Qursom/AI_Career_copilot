import { RagService } from './rag.service';
import type { EmbeddingService } from './embeddings/embedding.service';
import type { TypedConfigService } from '../config/typed-config.service';
import type { PineconeVectorStore } from './vector/pinecone-vector.store';

describe('RagService', () => {
  const makeConfig = (overrides?: Partial<Record<string, unknown>>) =>
    ({
      get: (key: string) =>
        (
          ({
            RAG_ENABLED: true,
            PINECONE_TOP_K: 8,
            PINECONE_MIN_SCORE: 0.55,
            ...overrides,
          }) as Record<string, unknown>
        )[key],
    }) as unknown as TypedConfigService;

  it('returns empty context when disabled', async () => {
    const service = new RagService(
      makeConfig({ RAG_ENABLED: false }),
      {
        embedText: jest.fn(),
      } as unknown as EmbeddingService,
      {
        query: jest.fn(),
      } as unknown as PineconeVectorStore,
    );

    await expect(
      service.buildResumeContext({ resume: 'text', role: 'Backend Engineer' }),
    ).resolves.toEqual({
      promptContext: '',
      marketSignals: [],
      priorityGaps: [],
      citations: [],
    });
  });

  it('builds evidence context and market-priority gaps', async () => {
    const service = new RagService(
      makeConfig(),
      {
        embedText: jest.fn().mockResolvedValue([0.1, 0.2]),
      } as unknown as EmbeddingService,
      {
        query: jest.fn().mockResolvedValue([
          {
            id: 'a',
            score: 0.82,
            metadata: {
              role: 'Backend Engineer',
              skill: 'Node.js and TypeScript',
              importance: 'core',
              evidence: 'Common requirement',
              sourceName: 'O*NET + ESCO crosswalk',
              sourceUrl: 'https://www.onetonline.org/',
            },
          },
          {
            id: 'b',
            score: 0.91,
            metadata: {
              role: 'Backend Engineer',
              skill: 'Observability with tracing and metrics',
              importance: 'important',
              evidence: 'Production reliability expectation',
              sourceName: 'O*NET + ESCO crosswalk',
              sourceUrl: 'https://www.onetonline.org/',
            },
          },
        ]),
      } as unknown as PineconeVectorStore,
    );

    const result = await service.buildResumeContext({
      role: 'Backend Engineer',
      resume: 'Built Node.js APIs with TypeScript and PostgreSQL.',
    });

    expect(result.promptContext).toContain('RAG EVIDENCE');
    expect(result.marketSignals.length).toBeGreaterThan(0);
    expect(result.priorityGaps.join(' ')).toContain('Observability');
    expect(result.citations[0]).toContain('O*NET');
  });
});
