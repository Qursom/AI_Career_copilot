import { z } from 'zod';
import { zProse, zScore0to100, zStringList } from '../common/zod-llm-json';

const ResumeAnalysisObject = z.object({
  fullName: z.string().min(1).max(200).default('Unknown'),
  email: z.string().max(200).default(''),
  phone: z.string().max(80).default(''),
  summary: zProse(10, 4_000),
  skills: zStringList(0, 40).default([]),
  projects: zStringList(0, 20).default([]),
  experience: zStringList(0, 20).default([]),
  education: zStringList(0, 15).default([]),
  critique: zProse(20, 4_000),
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

/** Accepts legacy persisted `roast` and maps it to `critique`. */
export const ResumeAnalysisSchema = z.preprocess((val) => {
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const o = { ...(val as Record<string, unknown>) };
    if (typeof o.critique !== 'string' && typeof o.roast === 'string') {
      o.critique = o.roast;
    }
    delete o.roast;
    return o;
  }
  return val;
}, ResumeAnalysisObject);

export type ResumeAnalysis = z.infer<typeof ResumeAnalysisSchema>;
