import { Logger } from '@nestjs/common';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { LlmService } from '../../../llm/llm.service';
import type { RagService } from '../../../rag/rag.service';
import type { PdfExtractService } from '../../../resume/pdf-extract.service';
import { createAnalyzeResumeNode } from './nodes/analyze-resume.node';
import { atsEvaluationNode } from './nodes/ats-evaluation.node';
import { createExtractTextNode } from './nodes/extract-text.node';
import { normalizeTextNode } from './nodes/normalize-text.node';
import { recommendationsNode } from './nodes/recommendations.node';
import { createRetrieveContextNode } from './nodes/retrieve-context.node';
import {
  routeAfterValidation,
  validateOutputNode,
} from './nodes/validate-output.node';
import { ResumeAnalysisAnnotation, type ResumeAnalysisState } from './state';

const logger = new Logger('ResumeAnalysisGraph');

export type ResumeGraphDeps = {
  pdf: Pick<PdfExtractService, 'extractFromPath'>;
  llm: Pick<LlmService, 'generateStructured'>;
  rag: Pick<RagService, 'buildResumeContext'>;
  maxRetries: number;
};

function failNode(state: ResumeAnalysisState) {
  const error =
    state.error ||
    (state.validationErrors?.length
      ? 'MAX_RETRIES_EXCEEDED'
      : 'STRUCTURED_OUTPUT_INVALID');
  logger.warn(
    `resume_analysis_failed userId=${state.userId} requestId=${state.requestId} error=${error} retryCount=${state.retryCount}`,
  );
  return { error };
}

/**
 * Resume Analysis LangGraph:
 * extract → normalize → retrieve → analyze ⇄ validate → ats → recommendations
 *
 * Retrieval sits after normalization so it can query on the extracted resume
 * text, which is the only place that text exists for a PDF upload.
 */
export function createResumeAnalysisGraph(deps: ResumeGraphDeps) {
  const extractText = createExtractTextNode({ pdf: deps.pdf });
  const retrieveContext = createRetrieveContextNode({ rag: deps.rag });
  const analyzeResume = createAnalyzeResumeNode({ llm: deps.llm });

  const graph = new StateGraph(ResumeAnalysisAnnotation)
    .addNode('extractText', extractText)
    .addNode('normalizeText', normalizeTextNode)
    .addNode('retrieveContext', retrieveContext)
    .addNode('analyzeResume', analyzeResume)
    .addNode('validateOutput', validateOutputNode)
    .addNode('atsEvaluation', atsEvaluationNode)
    .addNode('generateRecommendations', recommendationsNode)
    .addNode('fail', failNode)
    .addEdge(START, 'extractText')
    .addEdge('extractText', 'normalizeText')
    .addConditionalEdges('normalizeText', (state) =>
      state.error ? 'fail' : 'retrieveContext',
    )
    .addEdge('retrieveContext', 'analyzeResume')
    .addEdge('analyzeResume', 'validateOutput')
    .addConditionalEdges('validateOutput', (state) =>
      routeAfterValidation(state, deps.maxRetries),
    )
    .addEdge('atsEvaluation', 'generateRecommendations')
    .addEdge('generateRecommendations', END)
    .addEdge('fail', END);

  return graph.compile();
}

export type ResumeAnalysisGraph = ReturnType<typeof createResumeAnalysisGraph>;
