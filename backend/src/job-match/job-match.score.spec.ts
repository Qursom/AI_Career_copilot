import {
  computeJobMatchScore,
  deriveGaps,
  derivePriorityGaps,
  finalizeMatchResult,
} from './job-match.score';
import type { MatchResult, RequirementMatch } from './job-match.schema';

const req = (
  requirement: string,
  importance: RequirementMatch['importance'],
  status: RequirementMatch['status'],
  evidence = 'none',
): RequirementMatch => ({ requirement, importance, status, evidence });

const nodeJd =
  'Senior Node.js Engineer. Required: Node.js, TypeScript, NestJS, PostgreSQL.';
const nodeResume =
  'Jane. 6 years Node.js, TypeScript, NestJS, PostgreSQL. Built APIs.';
const csharpResume =
  'Jane. 6 years C#, .NET, ASP.NET, SQL Server. Built APIs.';

const baseLlm = (over: Partial<MatchResult> = {}): MatchResult => ({
  score: 90,
  strengths: ['Clear writing'],
  gaps: ['generic'],
  marketSignals: ['Kafka is highly demanded in 2026'],
  priorityGaps: ['invented'],
  citations: ['https://invented.example/report'],
  suggestions: ['Move existing NestJS work into the first two bullets.'],
  requirements: [],
  ...over,
});

describe('computeJobMatchScore', () => {
  it('TEST 1: Node.js resume + Node.js JD scores high', () => {
    const score = computeJobMatchScore({
      jobDescription: nodeJd,
      resume: nodeResume,
      llmScore: 50,
      requirements: [
        req('Node.js', 'required', 'matched', 'Node.js'),
        req('TypeScript', 'required', 'matched', 'TypeScript'),
        req('NestJS', 'required', 'matched', 'NestJS'),
        req('PostgreSQL', 'required', 'matched', 'PostgreSQL'),
      ],
    });
    expect(score).toBeGreaterThanOrEqual(75);
  });

  it('TEST 2: C#/.NET resume + Node.js JD scores low', () => {
    const score = computeJobMatchScore({
      jobDescription: nodeJd,
      resume: csharpResume,
      llmScore: 95,
      requirements: [
        req('Node.js', 'required', 'missing'),
        req('TypeScript', 'required', 'missing'),
        req('NestJS', 'required', 'missing'),
        req('PostgreSQL', 'required', 'missing'),
      ],
    });
    expect(score).toBeLessThanOrEqual(52);
  });

  it('TEST 3: React frontend resume + Node.js backend JD is not a strong match', () => {
    const score = computeJobMatchScore({
      jobDescription: nodeJd,
      resume: 'React Next.js frontend TypeScript CSS HTML',
      llmScore: 88,
      requirements: [
        req('Node.js', 'required', 'missing'),
        req('NestJS', 'required', 'missing'),
        req('TypeScript', 'required', 'matched', 'TypeScript'),
      ],
    });
    expect(score).toBeLessThanOrEqual(70);
  });

  it('TEST 4: Node + NestJS + PostgreSQL matching JD scores high', () => {
    const score = computeJobMatchScore({
      jobDescription: nodeJd,
      resume: nodeResume,
      llmScore: 40,
      requirements: [
        req('Node.js', 'required', 'matched', 'Node.js'),
        req('NestJS', 'required', 'matched', 'NestJS'),
        req('PostgreSQL', 'required', 'matched', 'PostgreSQL'),
      ],
    });
    expect(score).toBeGreaterThanOrEqual(75);
  });

  it('TEST 5: missing one required skill is partial coverage', () => {
    const requirements = [
      req('Node.js', 'required', 'matched', 'Node.js'),
      req('TypeScript', 'required', 'matched', 'TypeScript'),
      req('Kubernetes', 'required', 'missing'),
    ];
    const score = computeJobMatchScore({
      jobDescription: `${nodeJd} Kubernetes required.`,
      resume: nodeResume,
      llmScore: 90,
      requirements,
    });
    expect(score).toBeGreaterThan(40);
    expect(score).toBeLessThan(95);
    expect(deriveGaps(requirements).some((g) => /Kubernetes/i.test(g))).toBe(
      true,
    );
  });

  it('TEST 6: Kubernetes on JD but not resume is missing, not matched', () => {
    const requirements = [req('Kubernetes', 'required', 'missing')];
    expect(requirements[0].status).toBe('missing');
    expect(deriveGaps(requirements)[0]).toMatch(/Kubernetes/);
  });

  it('TEST 10: NodeJS vs Node.js is treated as matched when status is matched', () => {
    const score = computeJobMatchScore({
      jobDescription: 'Need Node.js',
      resume: 'Worked with NodeJS daily',
      llmScore: 40,
      requirements: [req('Node.js', 'required', 'matched', 'NodeJS')],
    });
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('TEST 11: React resume + Angular JD is capped as a stack conflict', () => {
    const score = computeJobMatchScore({
      jobDescription: 'Senior Angular Engineer. Angular required.',
      resume: 'React SPA TypeScript',
      llmScore: 99,
      requirements: [
        req('Angular', 'required', 'missing'),
        req('React', 'required', 'matched', 'React'),
      ],
    });
    expect(score).toBeLessThanOrEqual(52);
  });
});

describe('finalizeMatchResult', () => {
  it('TEST 7: RAG mentioning Kubernetes does not mark it matched', () => {
    const out = finalizeMatchResult({
      jobDescription: nodeJd + ' Kubernetes required.',
      resume: nodeResume,
      llm: baseLlm({
        requirements: [req('Kubernetes', 'required', 'missing')],
      }),
      rag: {
        marketSignals: ['Kubernetes is common for platform roles'],
        priorityGaps: ['Kubernetes operations'],
        citations: ['chunk-k8s'],
      },
    });
    expect(out.requirements[0].status).toBe('missing');
    expect(out.gaps.join(' ')).toMatch(/Kubernetes/);
  });

  it('TEST 8: marketSignals come from RAG, not invented LLM claims', () => {
    const out = finalizeMatchResult({
      jobDescription: nodeJd,
      resume: nodeResume,
      llm: baseLlm({
        requirements: [req('Node.js', 'required', 'matched', 'Node.js')],
      }),
      rag: {
        marketSignals: ['From retrieval: TypeScript demand'],
        priorityGaps: [],
        citations: ['ESCO'],
      },
    });
    expect(out.marketSignals).toEqual(['From retrieval: TypeScript demand']);
    expect(out.citations).toEqual(['ESCO']);
    expect(out.marketSignals.join(' ')).not.toMatch(/2026/);
  });

  it('TEST 9: preferred missing is not a required priority gap', () => {
    const requirements = [
      req('Node.js', 'required', 'matched', 'Node.js'),
      req('GraphQL', 'preferred', 'missing'),
    ];
    const gaps = deriveGaps(requirements);
    const priority = derivePriorityGaps(requirements, []);
    expect(gaps.some((g) => /Preferred:.*GraphQL/i.test(g))).toBe(true);
    expect(priority.join(' ')).not.toMatch(/GraphQL/);
    expect(priority.join(' ')).not.toMatch(/Node\.js/);
  });

  it('TEST 12: does not invent metrics in suggestions', () => {
    const suggestions = [
      'If you have NestJS experience, add it to the first two bullets.',
    ];
    const out = finalizeMatchResult({
      jobDescription: nodeJd,
      resume: nodeResume,
      llm: baseLlm({
        suggestions,
        requirements: [req('Node.js', 'required', 'matched', 'Node.js')],
      }),
      rag: { marketSignals: [], priorityGaps: [], citations: [] },
    });
    expect(out.suggestions).toEqual(suggestions);
    expect(out.suggestions.join(' ')).not.toMatch(/\d+%/);
  });

  it('empty RAG clears LLM marketSignals and citations', () => {
    const out = finalizeMatchResult({
      jobDescription: nodeJd,
      resume: nodeResume,
      llm: baseLlm({
        requirements: [req('Node.js', 'required', 'matched', 'Node.js')],
      }),
      rag: { marketSignals: [], priorityGaps: [], citations: [] },
    });
    expect(out.marketSignals).toEqual([]);
    expect(out.citations).toEqual([]);
  });
});
