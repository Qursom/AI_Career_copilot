import { z } from 'zod';
import { zProse, zScore0to100, zStringList } from '../common/zod-llm-json';

export const ResumeAnalysisSchema = z.object({
  fullName: z.string().min(1).max(200).default('Unknown'),
  email: z.string().max(200).default(''),
  phone: z.string().max(80).default(''),
  summary: zProse(10, 4_000),
  skills: zStringList(0, 40).default([]),
  projects: zStringList(0, 20).default([]),
  experience: zStringList(0, 20).default([]),
  education: zStringList(0, 15).default([]),
  roast: zProse(20, 4_000),
  strengths: zStringList(1, 10),
  weaknesses: zStringList(0, 10).default([]),
  improvements: zStringList(1, 10),
  recommendations: zStringList(0, 15).default([]),
  missingSkills: zStringList(0, 15),
  suggestedJobRole: z.string().min(1).max(200).default('Generalist'),
  marketSignals: zStringList(0, 10).default([]),
  priorityGaps: zStringList(0, 10).default([]),
  citations: zStringList(0, 10).default([]),
  optimized: zProse(20, 8_000),
  atsScore: zScore0to100,
  atsNotes: zProse(10, 4_000),
});

export type ResumeAnalysis = z.infer<typeof ResumeAnalysisSchema>;
