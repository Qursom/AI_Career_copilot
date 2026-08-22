/**
 * Maps a target-role string onto a tech stack and scores how well resume
 * text covers that stack. Used so a polished C# résumé is not scored like a
 * Node.js résumé (and vice versa).
 */

export interface StackFamily {
  id: string;
  label: string;
  roleHints: RegExp[];
  /** Needles that identify this stack in resume text (lowercase). */
  keywords: string[];
  /** Hits that mean the résumé is clearly this stack (not just shared tools). */
  exclusive: string[];
}

export const STACK_FAMILIES: StackFamily[] = [
  {
    id: 'node',
    label: 'Node.js',
    roleHints: [
      /\bnode(?:\.?js)?\b/i,
      /\bnest\.?js\b/i,
      /\bexpress\b/i,
      /\bfastify\b/i,
    ],
    keywords: [
      'node.js',
      'nodejs',
      'nestjs',
      'express',
      'fastify',
      'javascript',
      'typescript',
      'npm',
      'postgresql',
      'mongodb',
      'redis',
    ],
    exclusive: ['node.js', 'nodejs', 'nestjs', 'express', 'fastify'],
  },
  {
    id: 'csharp',
    label: 'C# / .NET',
    roleHints: [/\bc#\b/i, /\bcsharp\b/i, /\.net\b/i, /\bdotnet\b/i, /\basp\.?net\b/i],
    keywords: [
      'c#',
      'csharp',
      '.net',
      'dotnet',
      'asp.net',
      'entity framework',
      'ef core',
      'sql server',
      'azure',
      'blazor',
      'xamarin',
    ],
    exclusive: ['c#', 'csharp', '.net', 'dotnet', 'asp.net', 'entity framework'],
  },
  {
    id: 'java',
    label: 'Java',
    roleHints: [/\bjava\b/i, /\bspring\b/i],
    keywords: ['java', 'spring', 'spring boot', 'hibernate', 'kotlin', 'maven', 'gradle'],
    exclusive: ['java', 'spring boot', 'hibernate'],
  },
  {
    id: 'python',
    label: 'Python',
    roleHints: [/\bpython\b/i, /\bdjango\b/i, /\bfastapi\b/i, /\bflask\b/i],
    keywords: ['python', 'django', 'fastapi', 'flask', 'pandas', 'numpy'],
    exclusive: ['python', 'django', 'fastapi', 'flask'],
  },
  {
    id: 'frontend',
    label: 'Frontend',
    roleHints: [
      /\bfront[- ]?end\b/i,
      /\breact\b/i,
      /\bangular\b/i,
      /\bvue\b/i,
      /\bnext\.?js\b/i,
    ],
    keywords: ['react', 'next.js', 'angular', 'vue', 'typescript', 'css', 'html', 'tailwind'],
    exclusive: ['react', 'angular', 'vue', 'next.js'],
  },
];

export function detectTargetStack(role: string | undefined): StackFamily | undefined {
  const r = role?.trim();
  if (!r) return undefined;
  return STACK_FAMILIES.find((s) => s.roleHints.some((re) => re.test(r)));
}

export function detectResumeStack(haystack: string): StackFamily | undefined {
  const hay = haystack.toLowerCase();
  let best: { family: StackFamily; hits: number } | undefined;
  for (const family of STACK_FAMILIES) {
    const hits = family.exclusive.filter((k) => containsKeyword(hay, k)).length;
    if (hits >= 1 && (!best || hits > best.hits)) {
      best = { family, hits };
    }
  }
  return best?.family;
}

export function containsKeyword(hayLower: string, keyword: string): boolean {
  const k = keyword.toLowerCase();
  if (k === 'c#') return /c#|c-sharp|\bcsharp\b/.test(hayLower);
  if (k === '.net' || k === 'dotnet') return /\.net|\bdotnet\b/.test(hayLower);
  if (k === 'node.js' || k === 'nodejs') return /node\.?js/.test(hayLower);
  return hayLower.includes(k);
}

export interface RoleFitScore {
  /** 0–35 points for keyword coverage of the target stack. */
  coverage: number;
  /** 0–30 subtracted when the résumé stack conflicts with the target. */
  mismatchPenalty: number;
  target?: StackFamily;
  resumeStack?: StackFamily;
  matched: string[];
}

/**
 * Coverage of the target stack in resume text + extracted skills.
 * Shared tools (Docker, SQL) do not count as a stack match by themselves.
 */
export function scoreRoleFit(
  role: string | undefined,
  resumeText: string,
  skills: string[],
): RoleFitScore {
  const hay = `${resumeText}\n${skills.join(' ')}`.toLowerCase();
  const target = detectTargetStack(role);
  const resumeStack = detectResumeStack(hay);

  if (!target) {
    return { coverage: 0, mismatchPenalty: 0, resumeStack, matched: [] };
  }

  const matched = target.keywords.filter((k) => containsKeyword(hay, k));
  const coverage = Math.round(
    Math.min(35, (matched.length / Math.max(target.keywords.length, 1)) * 35),
  );

  const exclusiveHits = target.exclusive.filter((k) =>
    containsKeyword(hay, k),
  ).length;
  const mismatchPenalty =
    resumeStack && resumeStack.id !== target.id && exclusiveHits === 0
      ? 28
      : exclusiveHits === 0
        ? 18
        : 0;

  return {
    coverage,
    mismatchPenalty,
    target,
    resumeStack,
    matched,
  };
}
