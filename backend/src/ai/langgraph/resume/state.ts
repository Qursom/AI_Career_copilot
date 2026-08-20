import { Annotation } from '@langchain/langgraph';
import type { ResumeAnalysis } from '../../../resume/resume.schema';

/**
 * LangGraph state for the Resume Analysis agent.
 * Persistence (Mongo/Redis) stays outside the graph.
 */
export const ResumeAnalysisAnnotation = Annotation.Root({
  userId: Annotation<string>,
  requestId: Annotation<string>,
  filePath: Annotation<string | undefined>,
  rawText: Annotation<string | undefined>,
  normalizedText: Annotation<string | undefined>,
  role: Annotation<string | undefined>,
  /** Retrieved evidence formatted for the analysis prompt. */
  ragContext: Annotation<string | undefined>,
  /**
   * Retrieved evidence kept as structured lists too, because the caller merges
   * it with whatever the LLM claimed before persisting.
   */
  ragMarketSignals: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  ragPriorityGaps: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  ragCitations: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  resume: Annotation<ResumeAnalysis | undefined>,
  validationErrors: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  retryCount: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  atsScore: Annotation<number | undefined>,
  recommendations: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  error: Annotation<string | undefined>,
});

export type ResumeAnalysisState = typeof ResumeAnalysisAnnotation.State;
export type ResumeAnalysisUpdate = typeof ResumeAnalysisAnnotation.Update;
