import { z } from 'zod';

export const MatchResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  strengths: z.array(z.string().min(3).max(400)).min(1).max(10),
  gaps: z.array(z.string().min(3).max(400)).max(10),
  suggestions: z.array(z.string().min(3).max(400)).max(10),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;
