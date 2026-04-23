import { z } from 'zod';
import { zProse, zScore0to100, zStringList } from '../common/zod-llm-json';

/**
 * Trimmed, de-duplicated string list. Per-item min length is 1 so Gemini
 * cannot fail on a single short chip like "AI" or "CI/CD".
 */
export const ResumeAnalysisSchema = z.object({
  roast: zProse(20, 4_000),
  strengths: zStringList(1, 10),
  improvements: zStringList(1, 10),
  missingSkills: zStringList(0, 15),
  marketSignals: zStringList(0, 10).default([]),
  priorityGaps: zStringList(0, 10).default([]),
  citations: zStringList(0, 10).default([]),
  optimized: zProse(20, 8_000),
  atsScore: zScore0to100,
  atsNotes: zProse(10, 4_000),
});

export type ResumeAnalysis = z.infer<typeof ResumeAnalysisSchema>;
