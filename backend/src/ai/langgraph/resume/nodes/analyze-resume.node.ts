import { Logger } from '@nestjs/common';
import type { LlmService } from '../../../../llm/llm.service';
import { ResumeAnalysisSchema } from '../../../../resume/resume.schema';
import {
  RESUME_ANALYSIS_SYSTEM_PROMPT,
  buildResumeAnalysisUserPrompt,
} from '../prompts/resume.prompt';
import type { ResumeAnalysisState, ResumeAnalysisUpdate } from '../state';

const logger = new Logger('ResumeAnalyzeNode');

export type AnalyzeResumeDeps = {
  llm: Pick<LlmService, 'generateStructured'>;
};

export function createAnalyzeResumeNode(deps: AnalyzeResumeDeps) {
  return async (state: ResumeAnalysisState): Promise<ResumeAnalysisUpdate> => {
    if (state.error) {
      return {};
    }

    const normalizedText = state.normalizedText ?? '';
    if (normalizedText.length < 50) {
      return { error: 'EMPTY_RESUME' };
    }

    logger.log(
      `resume_llm_analysis_started userId=${state.userId} requestId=${state.requestId} retryCount=${state.retryCount}`,
    );

    try {
      const resume = await deps.llm.generateStructured({
        system: RESUME_ANALYSIS_SYSTEM_PROMPT,
        prompt: buildResumeAnalysisUserPrompt({
          normalizedText,
          role: state.role,
          ragContext: state.ragContext,
          validationErrors: state.validationErrors,
        }),
        schema: ResumeAnalysisSchema,
      });

      return {
        resume,
        validationErrors: [],
        error: undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        `resume_llm_analysis_failed userId=${state.userId} requestId=${state.requestId} retryCount=${state.retryCount} reason=${message.slice(0, 400)}`,
      );
      return {
        resume: undefined,
        validationErrors: [`LLM_ERROR: ${message.slice(0, 200)}`],
        error: undefined,
      };
    }
  };
}
