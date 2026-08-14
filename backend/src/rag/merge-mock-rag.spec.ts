import { mergeMockWithRagFields } from './merge-mock-rag';

describe('mergeMockWithRagFields', () => {
  const rag = {
    marketSignals: ['from retrieval a'],
    priorityGaps: ['from retrieval b'],
    citations: ['from retrieval c'],
  };
  const llm = {
    marketSignals: ['from mock'],
    priorityGaps: ['from mock'],
    citations: ['from mock'],
  };

  it('uses RAG when provider is mock and RAG has any evidence', () => {
    expect(mergeMockWithRagFields('mock', rag, llm)).toEqual(rag);
  });

  it('uses LLM when provider is not mock and LLM has values', () => {
    expect(mergeMockWithRagFields('gemini', rag, llm)).toEqual(llm);
  });

  it('prefers RAG for empty LLM when provider is gemini', () => {
    const emptyLlm = { marketSignals: [], priorityGaps: [], citations: [] };
    expect(mergeMockWithRagFields('gemini', rag, emptyLlm)).toEqual(rag);
  });

  it('uses LLM for mock when RAG is fully empty', () => {
    const emptyRag = {
      marketSignals: [] as string[],
      priorityGaps: [] as string[],
      citations: [] as string[],
    };
    expect(mergeMockWithRagFields('mock', emptyRag, llm)).toEqual({
      marketSignals: llm.marketSignals,
      priorityGaps: llm.priorityGaps,
      citations: llm.citations,
    });
  });
});
