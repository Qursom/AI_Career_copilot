import type { ResumeAnalysisState, ResumeAnalysisUpdate } from '../state';

/**
 * Normalize PDF extraction artifacts without destroying resume structure.
 *
 * `pdf-parse` separates pages with markers such as `-- 1 of 2 --`, which would
 * otherwise reach the LLM and the ATS keyword count as resume content.
 */
export function normalizeResumeText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^[ \t]*-{2,}\s*\d+\s+of\s+\d+\s*-{2,}[ \t]*$/gim, '')
    .replace(/^[ \t]*page\s+\d+\s+of\s+\d+[ \t]*$/gim, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\u0000/g, '')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .trim();
}

export function normalizeTextNode(
  state: ResumeAnalysisState,
): ResumeAnalysisUpdate {
  if (state.error) {
    return {};
  }

  const raw = state.rawText ?? '';
  const normalizedText = normalizeResumeText(raw);

  if (normalizedText.length < 50) {
    return {
      normalizedText,
      error: 'EMPTY_RESUME',
    };
  }

  return {
    normalizedText: normalizedText.slice(0, 20_000),
    error: undefined,
  };
}
