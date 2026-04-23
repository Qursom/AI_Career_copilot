import { LlmUpstreamError } from './llm.interface';
import { userMessageForUpstreamError } from './llm-upstream.user-message';

describe('userMessageForUpstreamError', () => {
  it('maps invalid API key (403)', () => {
    const err = new LlmUpstreamError(
      'Gemini call failed: Error fetching from https://...: [403 ] API key not valid',
    );
    expect(userMessageForUpstreamError(err)).toMatch(
      /api key|GEMINI|OpenAI|Google/i,
    );
  });

  it('maps model 404', () => {
    const err = new LlmUpstreamError(
      'Gemini call failed: [404 Not Found] models/gemini-x is not found',
    );
    expect(userMessageForUpstreamError(err)).toContain('GEMINI_MODEL');
  });

  it('passes through unknown errors (trimmed)', () => {
    const err = new LlmUpstreamError('Gemini call failed: Something obscure');
    expect(userMessageForUpstreamError(err)).toContain('Something obscure');
  });
});
