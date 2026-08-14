import { RagService } from './rag.service';
import type { TypedConfigService } from '../config/typed-config.service';

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

  const empty = {
    promptContext: '',
    marketSignals: [],
    priorityGaps: [],
    citations: [],
  };

  it('returns empty context when disabled', async () => {
    const service = new RagService(makeConfig({ RAG_ENABLED: false }));

    await expect(
      service.buildResumeContext({ resume: 'text', role: 'Backend Engineer' }),
    ).resolves.toEqual(empty);
  });

  it('returns empty context when RAG is enabled but no vector store is configured', async () => {
    const service = new RagService(makeConfig({ RAG_ENABLED: true }));

    const result = await service.buildResumeContext({
      role: 'Backend Engineer',
      resume: 'Built Node.js APIs with TypeScript and PostgreSQL.',
    });

    expect(result).toEqual(empty);
  });

  it('returns empty job-match context with the same shape', async () => {
    const service = new RagService(makeConfig());

    await expect(
      service.buildJobMatchContext({
        resume: 'resume text',
        jobDescription: 'job text',
      }),
    ).resolves.toEqual(empty);
  });
});
