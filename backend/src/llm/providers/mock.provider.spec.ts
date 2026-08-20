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

  it('ignores TARGET ROLE phrases that appear inside the resume body', async () => {
    const { buildResumeAnalysisUserPrompt } = await import(
      '../../ai/langgraph/resume/prompts/resume.prompt'
    );
    const prompt = buildResumeAnalysisUserPrompt({
      normalizedText: [
        'Priya Raman',
        'Staff Data Engineer',
        'priya@example.com',
        'TARGET ROLE: this is a heading in the PDF and must not overflow the schema',
        'Led Airflow and Snowflake pipelines. Built dbt models. Reduced cost 40%.',
        'x'.repeat(500),
      ].join('\n'),
      role: 'Data Engineer',
    });
    const out = await provider.generateStructured({
      system: 'resume',
      prompt,
      schema: ResumeAnalysisSchema,
    });
    expect(out.suggestedJobRole.length).toBeLessThanOrEqual(200);
    expect(out.suggestedJobRole).toBe('Data Engineer');
    expect(out.atsScore).toBeGreaterThanOrEqual(0);
  });

  it('still validates when the resume contains TARGET ROLE and no UI role was set', async () => {
    const { buildResumeAnalysisUserPrompt } = await import(
      '../../ai/langgraph/resume/prompts/resume.prompt'
    );
    const prompt = buildResumeAnalysisUserPrompt({
      normalizedText: [
        'Alex Chen',
        'TARGET ROLE: ' + 'x'.repeat(400),
        'Built Node.js APIs with TypeScript and PostgreSQL. Led a team of 4.',
      ].join('\n'),
    });
    const out = await provider.generateStructured({
      system: 'resume',
      prompt,
      schema: ResumeAnalysisSchema,
    });
    expect(out.suggestedJobRole.length).toBeLessThanOrEqual(200);
    expect(out.fullName.length).toBeGreaterThan(0);
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
