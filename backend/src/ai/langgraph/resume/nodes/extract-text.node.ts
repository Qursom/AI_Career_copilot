import { Logger } from '@nestjs/common';
import type { PdfExtractService } from '../../../../resume/pdf-extract.service';
import type { ResumeAnalysisState, ResumeAnalysisUpdate } from '../state';

const logger = new Logger('ResumeExtractTextNode');

export type ExtractTextDeps = {
  pdf: Pick<PdfExtractService, 'extractFromPath'>;
};

/**
 * Reads the temporary PDF (when present) and puts raw text into state.
 * Text-only runs may already have rawText and skip file I/O.
 */
export function createExtractTextNode(deps: ExtractTextDeps) {
  return async (state: ResumeAnalysisState): Promise<ResumeAnalysisUpdate> => {
    if (state.rawText && state.rawText.trim().length >= 50 && !state.filePath) {
      logger.log(
        `resume_text_extracted userId=${state.userId} requestId=${state.requestId} source=text`,
      );
      return { rawText: state.rawText.trim() };
    }

    if (!state.filePath) {
      if (state.rawText && state.rawText.trim().length >= 50) {
        return { rawText: state.rawText.trim() };
      }
      return {
        error: 'EMPTY_RESUME',
        rawText: state.rawText ?? '',
      };
    }

    try {
      const text = await deps.pdf.extractFromPath(state.filePath);
      logger.log(
        `resume_text_extracted userId=${state.userId} requestId=${state.requestId} source=pdf chars=${text.length}`,
      );
      return { rawText: text, error: undefined };
    } catch (err) {
      const code =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response?: { error?: string } }).response?.error ===
          'string'
          ? (err as { response: { error: string } }).response.error
          : 'PDF_EXTRACTION_FAILED';
      logger.warn(
        `resume_text_extraction_failed userId=${state.userId} requestId=${state.requestId} code=${code}`,
      );
      return {
        error: code === 'PDF_EMPTY' ? 'EMPTY_RESUME' : 'PDF_EXTRACTION_FAILED',
      };
    }
  };
}
