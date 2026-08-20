import { LlmUpstreamError } from './llm.interface';

/**
 * Turns SDK/network errors into safe, actionable text for the JSON error envelope
 * (so the UI is not stuck on a single generic 503 string).
 */
export function userMessageForUpstreamError(err: LlmUpstreamError): string {
  const m = err.message;
  const lower = m.toLowerCase();

  if (lower.includes('api key not valid') || /\b403\b/.test(m)) {
    return 'Invalid or missing API key. For Google set GEMINI_API_KEY; the app reads LLM config from backend/.env — restart after changes.';
  }
  if (/\b404\b/.test(m) && lower.includes('model')) {
    return 'Gemini model not found. Set GEMINI_MODEL to a name your key supports (try gemini-3.6-flash) and restart.';
  }
  if (
    m.includes(' 429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('resource exhausted')
  ) {
    return 'Model rate limit or quota. Wait and retry, or check billing and limits in Google AI.';
  }
  if (
    lower.includes('text not available') ||
    lower.includes('response was blocked') ||
    (lower.includes('prompt') && lower.includes('block')) ||
    (lower.includes('safety') && lower.includes('block'))
  ) {
    return 'The model returned no usable text (safety / blocked prompt or stop reason). Shorter or less sensitive text often helps; check backend logs for details.';
  }
  if (lower.includes('fetch') && lower.includes('network')) {
    return 'Network error calling the model API. Check your connection and that outbound HTTPS is allowed.';
  }

  const raw = m.startsWith('Gemini call failed: ')
    ? m.slice('Gemini call failed: '.length).trim()
    : m;
  return raw.length > 800 ? `${raw.slice(0, 800)}…` : raw;
}
