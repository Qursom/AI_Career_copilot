import { RagService } from './rag.service';
import type { TypedConfigService } from '../config/typed-config.service';
import type { EmbeddingService } from './embeddings/embedding.service';
import { NoopVectorStore } from './vector/noop-vector.store';

describe('RagService', () => {
  const makeConfig = (overrides?: Partial<Record<string, unknown>>) =>
    ({
      get: (key: string) =>
        (
          ({
            RAG_ENABLED: true,
            ...overrides,
          }) as Record<string, unknown>
        )[key],
    }) as unknown as TypedConfigService;

  const embeddings = {
    embedText: jest.fn().mockResolvedValue([]),
  } as unknown as EmbeddingService;

  const empty = {
    promptContext: '',
    marketSignals: [],
    priorityGaps: [],
    citations: [],
  };

  it('returns empty context when disabled', async () => {
    const service = new RagService(
      makeConfig({ RAG_ENABLED: false }),
      embeddings,
      new NoopVectorStore(),
    );

    await expect(
      service.buildResumeContext({ resume: 'text', role: 'Backend Engineer' }),
    ).resolves.toEqual(empty);
  });

  it('returns empty context when RAG is enabled but no vector store is configured', async () => {
    const service = new RagService(
      makeConfig({ RAG_ENABLED: true }),
      embeddings,
      new NoopVectorStore(),
    );

    const result = await service.buildResumeContext({
      role: 'Backend Engineer',
      resume: 'Built Node.js APIs with TypeScript and PostgreSQL.',
    });

    expect(result).toEqual(empty);
  });

  it('returns empty job-match context with the same shape', async () => {
    const service = new RagService(
      makeConfig(),
      embeddings,
      new NoopVectorStore(),
    );

    await expect(
      service.buildJobMatchContext({
        resume: 'resume text',
        jobDescription: 'job text',
      }),
    ).resolves.toEqual(empty);
  });
});
