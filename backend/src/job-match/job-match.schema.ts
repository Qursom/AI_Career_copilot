import { z } from 'zod';
import { zScore0to100, zStringList } from '../common/zod-llm-json';

export const RequirementImportanceSchema = z.enum([
  'required',
  'preferred',
  'responsibility',
  'nice-to-have',
]);

export const RequirementStatusSchema = z.enum([
  'matched',
  'partial',
  'missing',
  'unknown',
]);

export const RequirementMatchSchema = z.object({
  requirement: z.string().min(1).max(200),
  importance: RequirementImportanceSchema,
  status: RequirementStatusSchema,
  evidence: z.string().min(1).max(400),
});

export const MatchResultSchema = z.object({
  score: zScore0to100,
  strengths: zStringList(1, 10),
  gaps: zStringList(0, 10),
  marketSignals: zStringList(0, 10).default([]),
  priorityGaps: zStringList(0, 10).default([]),
  citations: zStringList(0, 10).default([]),
  suggestions: zStringList(0, 10),
  requirements: z.array(RequirementMatchSchema).max(30).default([]),
});

export type RequirementMatch = z.infer<typeof RequirementMatchSchema>;
export type MatchResult = z.infer<typeof MatchResultSchema>;
