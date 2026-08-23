import { resolveApiBaseUrl } from './api-base-url';

describe('resolveApiBaseUrl', () => {
  it('appends /api/v1 when only the Render origin is set', () => {
    expect(resolveApiBaseUrl('https://ai-career-copilot-7iee.onrender.com/')).toBe(
      'https://ai-career-copilot-7iee.onrender.com/api/v1',
    );
  });

  it('does not double the prefix', () => {
    expect(
      resolveApiBaseUrl('https://api.example.com/api/v1'),
    ).toBe('https://api.example.com/api/v1');
  });
});
