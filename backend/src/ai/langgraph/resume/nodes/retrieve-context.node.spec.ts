import { createRetrieveContextNode } from './retrieve-context.node';

describe('createRetrieveContextNode', () => {
  const state = {
    userId: 'u1',
    requestId: 'r1',
    role: 'Data Engineer',
    normalizedText:
      'Priya Raman — Staff Data Engineer. Airflow, dbt, Snowflake pipelines.',
    retryCount: 0,
    validationErrors: [],
    recommendations: [],
    ragMarketSignals: [],
    ragPriorityGaps: [],
    ragCitations: [],
  };

  it('queries RAG with the normalized resume text', async () => {
    const buildResumeContext = jest.fn().mockResolvedValue({
      promptContext: 'RAG EVIDENCE: dbt is expected',
      marketSignals: ['dbt is expected for Data Engineer'],
      priorityGaps: ['dbt'],
      citations: ['ESCO (https://esco.ec.europa.eu/)'],
    });
    const node = createRetrieveContextNode({ rag: { buildResumeContext } });

    const update = await node(state as never);

    expect(buildResumeContext).toHaveBeenCalledWith({
      role: 'Data Engineer',
      resume: state.normalizedText,
    });
    expect(update.ragMarketSignals).toEqual([
      'dbt is expected for Data Engineer',
    ]);
    expect(update.ragContext).toContain('RAG EVIDENCE');
  });

  it('degrades to empty evidence when retrieval fails', async () => {
    const node = createRetrieveContextNode({
      rag: {
        buildResumeContext: jest
          .fn()
          .mockRejectedValue(new Error('qdrant down')),
      },
    });

    const update = await node(state as never);

    expect(update.error).toBeUndefined();
    expect(update.ragMarketSignals).toEqual([]);
    expect(update.ragContext).toBeUndefined();
  });

  it('does not query when a prior node already failed', async () => {
    const buildResumeContext = jest.fn();
    const node = createRetrieveContextNode({ rag: { buildResumeContext } });

    await node({ ...state, error: 'EMPTY_RESUME' } as never);

    expect(buildResumeContext).not.toHaveBeenCalled();
  });
});
