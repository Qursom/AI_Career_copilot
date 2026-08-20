import { RagService } from './rag.service';
import type { TypedConfigService } from '../config/typed-config.service';
import type { EmbeddingService } from './embeddings/embedding.service';
import type { RagEvidence } from './rag.types';
import { NoopVectorStore } from './vector/noop-vector.store';
import type {
  VectorStore,
  VectorStoreDescription,
} from './vector/vector-store.interface';

describe('RagService', () => {
  const makeConfig = (overrides?: Partial<Record<string, unknown>>) =>
    ({
      get: (key: string) =>
        (
          ({
            RAG_ENABLED: true,
            QDRANT_COLLECTION: 'career_copilot_skills',
            ...overrides,
          }) as Record<string, unknown>
        )[key],
    }) as unknown as TypedConfigService;

  const embeddings = {
    embedText: jest.fn().mockResolvedValue([]),
  } as unknown as EmbeddingService;

  const makeEmbeddings = (opts?: {
    providerName?: string;
    dimensions?: number;
  }) =>
    ({
      providerName: opts?.providerName ?? 'mock-embeddings',
      dimensions: opts?.dimensions ?? 768,
      embedText: jest.fn().mockResolvedValue(new Array(768).fill(0.1)),
    }) as unknown as EmbeddingService;

  const evidence = (overrides?: Partial<RagEvidence>): RagEvidence => ({
    skill: 'dbt',
    role: 'Data Engineer',
    importance: 'core',
    evidence: 'Analytics engineering roles ask for dbt.',
    sourceName: 'ESCO',
    sourceUrl: 'https://esco.ec.europa.eu/',
    score: 0.8,
    embeddingProvider: 'mock-embeddings',
    ...overrides,
  });

  const makeStore = (opts: {
    description: VectorStoreDescription;
    hits?: RagEvidence[];
  }) => {
    const search = jest.fn().mockResolvedValue(opts.hits ?? []);
    const store: VectorStore = {
      name: 'qdrant',
      describe: jest.fn().mockResolvedValue(opts.description),
      ensureCollection: jest.fn().mockResolvedValue(undefined),
      writeCorpusMeta: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue(0),
      search,
    };
    return { store, search };
  };

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

  it('returns evidence when the corpus matches the active provider', async () => {
    const { store, search } = makeStore({
      description: { exists: true, dimensions: 768, pointCount: 29 },
      hits: [evidence()],
    });
    const service = new RagService(makeConfig(), makeEmbeddings(), store);
    await service.onModuleInit();

    const result = await service.buildResumeContext({
      role: 'Data Engineer',
      resume: 'Airflow, dbt, and Snowflake pipelines.',
    });

    expect(search).toHaveBeenCalled();
    expect(result.marketSignals).toHaveLength(1);
    expect(result.priorityGaps).toEqual(['dbt']);
    expect(result.promptContext).toContain('RAG EVIDENCE');
  });

  it('does not query a collection that has never been ingested', async () => {
    const { store, search } = makeStore({ description: { exists: false } });
    const service = new RagService(makeConfig(), makeEmbeddings(), store);
    await service.onModuleInit();

    await expect(
      service.buildResumeContext({ resume: 'Airflow and dbt pipelines.' }),
    ).resolves.toEqual(empty);
    expect(search).not.toHaveBeenCalled();
  });

  it('refuses to query when the collection width does not match the provider', async () => {
    const { store, search } = makeStore({
      description: { exists: true, dimensions: 768, pointCount: 29 },
    });
    const service = new RagService(
      makeConfig(),
      makeEmbeddings({ dimensions: 1536 }),
      store,
    );
    await service.onModuleInit();

    await expect(
      service.buildResumeContext({ resume: 'Airflow and dbt pipelines.' }),
    ).resolves.toEqual(empty);
    expect(search).not.toHaveBeenCalled();
  });

  it('refuses to query when collection metadata names a different embedding provider', async () => {
    const { store, search } = makeStore({
      description: {
        exists: true,
        dimensions: 768,
        pointCount: 40,
        embeddingProvider: 'gemini-embeddings',
      },
    });
    const service = new RagService(
      makeConfig(),
      makeEmbeddings({ providerName: 'mock-embeddings' }),
      store,
    );
    await service.onModuleInit();

    await expect(
      service.buildResumeContext({ resume: 'Airflow and dbt pipelines.' }),
    ).resolves.toEqual(empty);
    expect(search).not.toHaveBeenCalled();
  });

  it('discards hits that were ingested with a different embedding provider', async () => {
    const { store } = makeStore({
      description: { exists: true, dimensions: 768, pointCount: 29 },
      hits: [evidence({ embeddingProvider: 'gemini-embeddings' })],
    });
    const service = new RagService(
      makeConfig(),
      makeEmbeddings({ providerName: 'mock-embeddings' }),
      store,
    );
    await service.onModuleInit();

    await expect(
      service.buildResumeContext({ resume: 'Airflow and dbt pipelines.' }),
    ).resolves.toEqual(empty);
  });

  it('disables retrieval when Qdrant rejects with Forbidden', async () => {
    const search = jest.fn();
    const store: VectorStore = {
      name: 'qdrant',
      describe: jest.fn().mockRejectedValue(new Error('Forbidden')),
      ensureCollection: jest.fn().mockResolvedValue(undefined),
      writeCorpusMeta: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue(0),
      search,
    };
    const service = new RagService(makeConfig(), makeEmbeddings(), store);
    await service.onModuleInit();

    await expect(
      service.buildResumeContext({ resume: 'Airflow and dbt pipelines.' }),
    ).resolves.toEqual(empty);
    expect(search).not.toHaveBeenCalled();
  });
});
