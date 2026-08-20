import { Logger } from '@nestjs/common';
import type { RagService } from '../../../../rag/rag.service';
import type { ResumeAnalysisState, ResumeAnalysisUpdate } from '../state';

const logger = new Logger('ResumeRetrieveContextNode');

export type RetrieveContextDeps = {
  rag: Pick<RagService, 'buildResumeContext'>;
};

/**
 * Retrieval lives inside the graph, after extraction, so a PDF upload queries
 * the corpus with the resume's own text instead of the role alone.
 *
 * Evidence is advisory: retrieval problems degrade the analysis rather than
 * failing it, so this node never sets `error`.
 */
export function createRetrieveContextNode(deps: RetrieveContextDeps) {
  return async (state: ResumeAnalysisState): Promise<ResumeAnalysisUpdate> => {
    if (state.error) return {};

    const resume = state.normalizedText ?? '';
    try {
      const context = await deps.rag.buildResumeContext({
        role: state.role,
        resume,
      });
      logger.log(
        `resume_rag_context_built userId=${state.userId} requestId=${state.requestId} queryChars=${resume.length} signals=${context.marketSignals.length} citations=${context.citations.length}`,
      );
      return {
        ragContext: context.promptContext || undefined,
        ragMarketSignals: context.marketSignals,
        ragPriorityGaps: context.priorityGaps,
        ragCitations: context.citations,
      };
    } catch (err) {
      logger.warn(
        `resume_rag_context_failed userId=${state.userId} requestId=${state.requestId} reason=${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        ragContext: undefined,
        ragMarketSignals: [],
        ragPriorityGaps: [],
        ragCitations: [],
      };
    }
  };
}
