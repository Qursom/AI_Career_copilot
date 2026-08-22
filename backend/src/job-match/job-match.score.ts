import { detectResumeStack, detectTargetStack, scoreRoleFit } from '../ai/langgraph/resume/role-fit';
import type { MatchResult, RequirementMatch } from './job-match.schema';

const STATUS_POINTS: Record<RequirementMatch['status'], number> = {
  matched: 1,
  partial: 0.45,
  unknown: 0.2,
  missing: 0,
};

const EXPERIENCE_RE =
  /\b(year|years|senior|junior|staff|principal|lead|domain|education|degree|bachelor|master|phd|certif)/i;

const STACK_WEIGHT = 5;
const MISMATCH_CAP = 52;

type Bucket = 'required' | 'preferred' | 'responsibility' | 'experience';

const BASE_WEIGHTS: Record<Bucket, number> = {
  required: 35,
  preferred: 15,
  responsibility: 15,
  experience: 20,
};

export function requirementBucket(row: RequirementMatch): Bucket {
  if (row.importance === 'preferred' || row.importance === 'nice-to-have') {
    return 'preferred';
  }
  if (row.importance === 'responsibility') return 'responsibility';
  if (EXPERIENCE_RE.test(row.requirement)) return 'experience';
  return 'required';
}

function avgPoints(rows: RequirementMatch[]): number | null {
  if (!rows.length) return null;
  const sum = rows.reduce((acc, row) => acc + STATUS_POINTS[row.status], 0);
  return sum / rows.length;
}

function frontendFrameworkConflict(jd: string, resume: string): boolean {
  const jdAngular = /\bangular\b/i.test(jd);
  const jdReact = /\breact\b/i.test(jd) && !/\breact\s*native\b/i.test(jd);
  const resAngular = /\bangular\b/i.test(resume);
  const resReact = /\breact\b/i.test(resume);
  if (jdAngular && resReact && !resAngular) return true;
  if (jdReact && resAngular && !resReact) return true;
  return false;
}

function stackConflict(jobDescription: string, resume: string): boolean {
  const fit = scoreRoleFit(jobDescription, resume, []);
  if (fit.target && fit.resumeStack && fit.target.id !== fit.resumeStack.id) {
    return true;
  }
  return frontendFrameworkConflict(jobDescription, resume);
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeJobMatchScore(args: {
  requirements: RequirementMatch[];
  jobDescription: string;
  resume: string;
  llmScore: number;
}): number {
  const { requirements, jobDescription, resume, llmScore } = args;
  const fit = scoreRoleFit(jobDescription, resume, []);
  const stackPct = fit.target ? fit.coverage / 35 : 0.5;
  const conflict = stackConflict(jobDescription, resume);

  let raw: number;
  if (!requirements.length) {
    raw = 0.4 * llmScore + 0.6 * stackPct * 100;
  } else {
    const buckets: Record<Bucket, RequirementMatch[]> = {
      required: [],
      preferred: [],
      responsibility: [],
      experience: [],
    };
    for (const row of requirements) {
      buckets[requirementBucket(row)].push(row);
    }

    let weightSum = 0;
    let weighted = 0;
    for (const key of Object.keys(BASE_WEIGHTS) as Bucket[]) {
      const avg = avgPoints(buckets[key]);
      if (avg == null) continue;
      weightSum += BASE_WEIGHTS[key];
      weighted += avg * BASE_WEIGHTS[key];
    }
    const reqScore = weightSum > 0 ? (weighted / weightSum) * (100 - STACK_WEIGHT) : 0;
    raw = reqScore + stackPct * STACK_WEIGHT;
  }

  let score = clampScore(raw);
  if (conflict) score = Math.min(score, MISMATCH_CAP);
  return score;
}

export function deriveGaps(requirements: RequirementMatch[]): string[] {
  const required: string[] = [];
  const preferred: string[] = [];
  for (const row of requirements) {
    if (row.status !== 'missing' && row.status !== 'partial') continue;
    const line = `${row.requirement} (${row.status})`;
    if (row.importance === 'preferred' || row.importance === 'nice-to-have') {
      preferred.push(`Preferred: ${line}`);
    } else if (row.importance === 'required') {
      required.push(line);
    }
  }
  return [...required, ...preferred].slice(0, 10);
}

export function deriveStrengths(
  requirements: RequirementMatch[],
  llmStrengths: string[],
): string[] {
  const fromReq = requirements
    .filter((row) => row.status === 'matched')
    .map((row) => row.requirement);
  const merged = [...fromReq, ...llmStrengths];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of merged) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
    if (out.length >= 10) break;
  }
  return out.length ? out : llmStrengths.slice(0, 10);
}

export function derivePriorityGaps(
  requirements: RequirementMatch[],
  ragPriority: string[],
): string[] {
  const fromReq = requirements
    .filter(
      (row) =>
        row.importance === 'required' &&
        (row.status === 'missing' || row.status === 'partial'),
    )
    .map((row) => `${row.requirement} is a required gap (${row.status}).`);
  const seen = new Set(fromReq.map((s) => s.toLowerCase()));
  const extra = ragPriority.filter((s) => {
    const key = s.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...fromReq, ...extra].slice(0, 10);
}

export function applyMarketFromRag(
  rag: { marketSignals: string[]; citations: string[] },
): { marketSignals: string[]; citations: string[] } {
  return {
    marketSignals: rag.marketSignals.length ? rag.marketSignals.slice(0, 10) : [],
    citations: rag.citations.length ? rag.citations.slice(0, 10) : [],
  };
}

export function finalizeMatchResult(args: {
  llm: MatchResult;
  rag: {
    marketSignals: string[];
    priorityGaps: string[];
    citations: string[];
  };
  jobDescription: string;
  resume: string;
}): MatchResult {
  const requirements = args.llm.requirements ?? [];
  const score = computeJobMatchScore({
    requirements,
    jobDescription: args.jobDescription,
    resume: args.resume,
    llmScore: args.llm.score,
  });
  const gaps = requirements.length
    ? deriveGaps(requirements)
    : args.llm.gaps;
  const strengths = requirements.length
    ? deriveStrengths(requirements, args.llm.strengths)
    : args.llm.strengths;
  const priorityGaps = derivePriorityGaps(requirements, args.rag.priorityGaps);
  const market = applyMarketFromRag(args.rag);

  const safeGaps = gaps.length ? gaps : args.llm.gaps;
  const safeStrengths = strengths.length ? strengths : args.llm.strengths;

  return {
    ...args.llm,
    score,
    strengths: safeStrengths.slice(0, 10),
    gaps: safeGaps.slice(0, 10),
    suggestions: args.llm.suggestions,
    requirements,
    marketSignals: market.marketSignals,
    citations: market.citations,
    priorityGaps: priorityGaps.length ? priorityGaps : args.llm.priorityGaps,
  };
}

export function stacksLookConflicting(
  jobDescription: string,
  resume: string,
): boolean {
  return stackConflict(jobDescription, resume);
}

export { detectResumeStack, detectTargetStack };
