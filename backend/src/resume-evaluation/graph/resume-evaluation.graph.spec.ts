import { coverLetterRoute } from './resume-evaluation.graph';

describe('resume evaluation graph routing', () => {
  it('routes to cover letter evaluation when present', () => expect(coverLetterRoute({ coverLetter: 'Dear hiring manager...' } as any)).toBe('evaluateCoverLetter'));
  it('skips cover letter evaluation when absent', () => expect(coverLetterRoute({} as any)).toBe('calculateVerdict'));
});
