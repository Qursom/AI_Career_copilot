import { createHash } from 'crypto';

/** Stable hash of the JD + resume pair used as the cache and store key. */
export function jobMatchContentHash(
  jobDescription: string,
  resume: string,
): string {
  return createHash('sha256')
    .update(`${jobDescription.trim()}\n---\n${resume.trim()}`)
    .digest('hex');
}

const SKIP_LINE =
  /^(about (the )?(job|us|the company)|company overview|description|job description|overview|summary|who we are|the role|position overview|apply now|skip to|posted)$/i;

const LEAD_IN =
  /^(?:about the job|job description|description|overview|who we are|company overview)\s*[:.\-–—]?\s*/i;

const TITLE_LABEL =
  /^(?:job\s*title|title|position(?:\s*title)?|role|job\s*role|opening)\s*[:|#\-–—]\s*(.+)$/i;

const ROLE_NOUN =
  /\b(engineers?|developers?|designers?|managers?|analysts?|scientists?|architects?|specialists?|leads?|directors?|interns?|consultants?|officers?|coordinators?|programmers?|administrators?|recruiters?|researchers?)\b/i;

const SENIORITY =
  /^(intern|junior|jr|mid-level|mid|senior|sr|staff|principal|lead|chief|head)$/i;

const STACK_WORD =
  /^(full-?stack|frontend|front-end|backend|back-end|software|data|platform|devops|security|mobile|ios|android|cloud|sre|qa|product|project|web|node\.?js|\.net|c#|python|java|react|golang|go|ruby|php|ai|ml|machine)$/i;

/**
 * Short label for history lists: job title when we can find one,
 * otherwise a word-safe truncation of the JD (not a mid-word slice).
 */
export function jobPreview(jobDescription: string, max = 100): string {
  const stripped = stripLeadIn(stripNoise(jobDescription));
  const title = extractJobTitle(stripped);
  return truncateAtWord(title || stripped, max);
}

export function extractJobTitle(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[#>*\-\d.)\s]+/, '').trim())
    .filter((line) => line.length > 0);

  for (const line of lines.slice(0, 30)) {
    const labeled = line.match(TITLE_LABEL);
    if (labeled?.[1]) {
      const value = cleanTitle(labeled[1]);
      if (value.length >= 3) return value;
    }
  }

  const collapsed = stripLeadIn(raw.replace(/\s+/g, ' '));
  const hiring = collapsed.match(
    /(?:we are |we're |we’re )?(?:hiring|looking for|seeking)\s+(?:an?\s+)?(.{8,90}?)(?:\s+to\s+|\s+who\s+|\.|$)/i,
  );
  if (hiring?.[1] && ROLE_NOUN.test(hiring[1])) {
    return cleanTitle(hiring[1]);
  }

  const phrase = extractRolePhrase(collapsed);
  if (phrase) return phrase;

  for (const line of lines.slice(0, 12)) {
    if (SKIP_LINE.test(line)) continue;
    if (line.length < 6 || line.length > 90) continue;
    if (ROLE_NOUN.test(line) || looksLikeTitleCase(line)) {
      return cleanTitle(line);
    }
  }

  return '';
}

function extractRolePhrase(collapsed: string): string {
  const match = collapsed.match(ROLE_NOUN);
  if (!match || match.index == null) return '';

  const words = collapsed.split(/\s+/);
  let char = 0;
  let nounIndex = -1;
  for (let i = 0; i < words.length; i += 1) {
    if (char === match.index) {
      nounIndex = i;
      break;
    }
    char += words[i].length + 1;
  }
  if (nounIndex < 0) {
    nounIndex = words.findIndex((word) => ROLE_NOUN.test(word));
  }
  if (nounIndex < 0) return '';

  let start = nounIndex;
  while (start > 0) {
    const prev = words[start - 1].replace(/[(),]/g, '');
    if (SENIORITY.test(prev) || STACK_WORD.test(prev) || /^[A-Z][A-Za-z.+#/]*$/.test(prev)) {
      start -= 1;
      continue;
    }
    break;
  }

  let end = nounIndex;
  if (end + 1 < words.length && STACK_WORD.test(words[end + 1].replace(/[(),]/g, ''))) {
    end += 1;
  }

  const phrase = words.slice(start, end + 1).join(' ');
  if (phrase.length < 8 || phrase.length > 80) return '';
  return cleanTitle(phrase);
}

function stripNoise(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\u00a0/g, ' ');
}

function stripLeadIn(text: string): string {
  return text.trim().replace(LEAD_IN, '').trim();
}

function looksLikeTitleCase(line: string): boolean {
  const words = line.split(/\s+/);
  if (words.length < 2 || words.length > 12) return false;
  const capped = words.filter((word) => /^[A-Z]/.test(word)).length;
  return capped / words.length >= 0.55;
}

function cleanTitle(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[|:.\-–—]+$/g, '')
    .trim();
}

function truncateAtWord(text: string, max: number): string {
  const collapsed = text.trim().replace(/\s+/g, ' ');
  if (collapsed.length <= max) return collapsed;
  const sliced = collapsed.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const cut = lastSpace > Math.floor(max * 0.45) ? sliced.slice(0, lastSpace) : sliced;
  return `${cut}…`;
}
