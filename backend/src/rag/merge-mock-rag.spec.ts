import { mergeMockWithRagFields } from './merge-mock-rag';

describe('mergeMockWithRagFields', () => {
  const rag = {
    marketSignals: ['from pinecone a'],
    priorityGaps: ['from pinecone b'],
    citations: ['from pinecone c'],
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
    expect(mergeMockWithRagFields('openai', rag, llm)).toEqual(llm);
  });

  it('prefers RAG for empty LLM when provider is openai', () => {
    const emptyLlm = { marketSignals: [], priorityGaps: [], citations: [] };
    expect(mergeMockWithRagFields('openai', rag, emptyLlm)).toEqual(rag);
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
