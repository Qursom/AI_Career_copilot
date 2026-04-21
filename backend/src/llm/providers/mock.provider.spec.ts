import { z } from 'zod';
import { ResumeAnalysisSchema } from '../../resume/resume.schema';
import { MatchResultSchema } from '../../job-match/job-match.schema';
import { LlmInvalidOutputError } from '../llm.interface';
import { MockLlmProvider } from './mock.provider';

describe('MockLlmProvider', () => {
  const provider = new MockLlmProvider();

  it('produces valid resume analyses', async () => {
    const out = await provider.generateStructured({
      system: 'resume',
      prompt: 'Jane Doe, TypeScript, React, 5 years of shipped work.',
      schema: ResumeAnalysisSchema,
    });
    expect(out.atsScore).toBeGreaterThanOrEqual(0);
    expect(out.atsScore).toBeLessThanOrEqual(100);
    expect(out.roast.length).toBeGreaterThan(0);
    expect(out.strengths.length).toBeGreaterThan(0);
    expect(out.improvements.length).toBeGreaterThan(0);
    expect(Array.isArray(out.missingSkills)).toBe(true);
  });

  it('produces valid match results', async () => {
    const out = await provider.generateStructured({
      system: 'match',
      prompt: 'JD and resume for a senior frontend engineer.',
      schema: MatchResultSchema,
    });
    expect(out.strengths.length).toBeGreaterThan(0);
    expect(Array.isArray(out.suggestions)).toBe(true);
  });

  it('throws LlmInvalidOutputError when schema cannot be satisfied', async () => {
    const strict = z.object({ notInFake: z.string() });
    await expect(
      provider.generateStructured({
        system: 'x',
        prompt: 'y',
        schema: strict,
      }),
    ).rejects.toBeInstanceOf(LlmInvalidOutputError);
  });
});
