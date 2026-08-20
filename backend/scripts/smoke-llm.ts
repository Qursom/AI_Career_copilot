import 'dotenv/config';
import { GeminiProvider } from '../src/llm/providers/gemini.provider';
import { GroqLangChainProvider } from '../src/llm/providers/groq.provider';
import type { LlmProvider } from '../src/llm/llm.interface';
import { ResumeAnalysisSchema } from '../src/resume/resume.schema';
import {
  RESUME_ANALYSIS_SYSTEM_PROMPT,
  buildResumeAnalysisUserPrompt,
} from '../src/ai/langgraph/resume/prompts/resume.prompt';

const SAMPLE = `
Jane Doe
Senior Frontend Engineer  jane.doe@example.com  +1-555-0100

SUMMARY
5+ years shipping TypeScript and React. Led a design-system used by six product
teams. Owned a checkout rewrite that lifted conversion 14%. Mentored three engineers.

SKILLS
TypeScript, React, Next.js, Node.js, GraphQL, Playwright, WCAG 2.2, AWS

EXPERIENCE
Staff Frontend Engineer, Acme — 2022–present
- Shipped a Next.js checkout rewrite; LCP 3.8s to 1.4s, conversion +14%.
- Built a WCAG 2.2 AA design system in Storybook; a11y bugs 18/qtr to 2/qtr.
- Mentored three engineers; two promoted within 12 months.

EDUCATION
BSc Computer Science
`.trim();

async function run(name: 'gemini' | 'groq', provider: LlmProvider): Promise<void> {
  const started = Date.now();
  console.log(`\n=== ${name} ===`);
  try {
    const out = await provider.generateStructured({
      system: RESUME_ANALYSIS_SYSTEM_PROMPT,
      prompt: buildResumeAnalysisUserPrompt({
        normalizedText: SAMPLE,
        role: 'Senior Frontend Engineer',
      }),
      schema: ResumeAnalysisSchema,
      timeoutMs: 45_000,
    });
    console.log(`ok in ${Date.now() - started}ms`);
    console.log(`  name=${out.fullName}  ats=${out.atsScore}  role=${out.suggestedJobRole}`);
    console.log(`  skills=${out.skills.slice(0, 6).join(', ')}`);
    console.log(`  strengths=${out.strengths.length}  improvements=${out.improvements.length}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`FAIL in ${Date.now() - started}ms: ${message.slice(0, 400)}`);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const which = (process.argv[2] ?? 'both').toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (which === 'gemini' || which === 'both') {
    if (!geminiKey) {
      console.log('=== gemini === SKIP (no GEMINI_API_KEY)');
    } else {
      await run(
        'gemini',
        new GeminiProvider({
          apiKey: geminiKey,
          model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
          defaultTimeoutMs: 45_000,
        }),
      );
    }
  }

  if (which === 'groq' || which === 'both') {
    if (!groqKey) {
      console.log('=== groq === SKIP (no GROQ_API_KEY)');
    } else {
      await run(
        'groq',
        new GroqLangChainProvider({
          apiKey: groqKey,
          model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
          defaultTimeoutMs: 45_000,
        }),
      );
    }
  }
}

void main();
