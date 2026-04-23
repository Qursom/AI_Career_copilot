import { z } from 'zod';
import { zScore0to100, zStringList } from '../common/zod-llm-json';

export const MatchResultSchema = z.object({
  score: zScore0to100,
  strengths: zStringList(1, 10),
  gaps: zStringList(0, 10),
  marketSignals: zStringList(0, 10).default([]),
  priorityGaps: zStringList(0, 10).default([]),
  citations: zStringList(0, 10).default([]),
  suggestions: zStringList(0, 10),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;
