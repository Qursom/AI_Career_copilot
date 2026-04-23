import type { RagContext } from './rag.types';

export type RagSlice = Pick<
  RagContext,
  'marketSignals' | 'priorityGaps' | 'citations'
>;

/**
 * When the active LLM is `mock`, it always returns non-empty RAG-like arrays from
 * heuristics, which previously hid real Pinecone retrieval. If retrieval produced
 * evidence, prefer those fields for display accuracy.
 */
export function mergeMockWithRagFields(
  providerName: string,
  rag: RagSlice,
  llm: {
    marketSignals: string[];
    priorityGaps: string[];
    citations: string[];
  },
): { marketSignals: string[]; priorityGaps: string[]; citations: string[] } {
  const ragHasEvidence =
    rag.marketSignals.length > 0 ||
    rag.priorityGaps.length > 0 ||
    rag.citations.length > 0;

  if (providerName === 'mock' && ragHasEvidence) {
    return {
      marketSignals: rag.marketSignals,
      priorityGaps: rag.priorityGaps,
      citations: rag.citations,
    };
  }

  return {
    marketSignals: llm.marketSignals.length
      ? llm.marketSignals
      : rag.marketSignals,
    priorityGaps: llm.priorityGaps.length
      ? llm.priorityGaps
      : rag.priorityGaps,
    citations: llm.citations.length ? llm.citations : rag.citations,
  };
}
