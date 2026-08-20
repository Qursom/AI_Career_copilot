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

export function jobPreview(jobDescription: string, max = 160): string {
  const collapsed = jobDescription.trim().replace(/\s+/g, ' ');
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max - 1)}…`;
}
