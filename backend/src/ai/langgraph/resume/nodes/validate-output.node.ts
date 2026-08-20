import { Logger } from '@nestjs/common';
import { ResumeAnalysisSchema } from '../../../../resume/resume.schema';
import type { ResumeAnalysisState, ResumeAnalysisUpdate } from '../state';

const logger = new Logger('ResumeValidateOutputNode');

/**
 * Zod-validate LLM output. On failure, increment retryCount and set errors.
 */
export function validateOutputNode(
  state: ResumeAnalysisState,
): ResumeAnalysisUpdate {
  if (state.error) {
    return {};
  }

  if (!state.resume) {
    const errors = state.validationErrors?.length
      ? state.validationErrors
      : ['STRUCTURED_OUTPUT_INVALID: missing resume payload'];
    logger.warn(
      `resume_validation_failed userId=${state.userId} requestId=${state.requestId} retryCount=${state.retryCount} errors=${errors.join(' | ').slice(0, 400)}`,
    );
    return {
      validationErrors: errors,
      retryCount: state.retryCount + 1,
    };
  }

  const parsed = ResumeAnalysisSchema.safeParse(state.resume);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (i) => `${i.path.join('.') || 'root'}: ${i.message}`,
    );
    logger.warn(
      `resume_validation_failed userId=${state.userId} requestId=${state.requestId} retryCount=${state.retryCount} issues=${errors.length} errors=${errors.join(' | ').slice(0, 400)}`,
    );
    return {
      validationErrors: errors,
      retryCount: state.retryCount + 1,
    };
  }

  const data = parsed.data;
  const extra: string[] = [];
  if (data.atsScore < 0 || data.atsScore > 100) {
    extra.push('atsScore must be 0-100');
  }
  if (!Array.isArray(data.skills)) extra.push('skills must be an array');
  if (!Array.isArray(data.recommendations)) {
    extra.push('recommendations must be an array');
  }
  if (!Array.isArray(data.missingSkills)) {
    extra.push('missingSkills must be an array');
  }

  if (extra.length) {
    logger.warn(
      `resume_validation_failed userId=${state.userId} requestId=${state.requestId} retryCount=${state.retryCount}`,
    );
    return {
      validationErrors: extra,
      retryCount: state.retryCount + 1,
    };
  }

  return {
    resume: data,
    validationErrors: [],
  };
}

export type ValidateRoute = 'atsEvaluation' | 'analyzeResume' | 'fail';

export function routeAfterValidation(
  state: ResumeAnalysisState,
  maxRetries: number,
): ValidateRoute {
  if (state.error) {
    return 'fail';
  }
  if (!state.validationErrors?.length && state.resume) {
    return 'atsEvaluation';
  }
  if (state.retryCount <= maxRetries) {
    logger.log(
      `resume_analysis_retry userId=${state.userId} requestId=${state.requestId} retryCount=${state.retryCount} max=${maxRetries}`,
    );
    return 'analyzeResume';
  }
  return 'fail';
}
