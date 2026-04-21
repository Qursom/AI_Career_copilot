import { z } from 'zod';

/**
 * Trimmed, de-duplicated, non-empty string list with a sane upper bound.
 * Rejects arrays that collapse to zero useful entries so the UI never shows
 * an empty "Strengths" section.
 */
const bulletList = (min: number, max: number) =>
  z
    .array(z.string().min(3).max(400))
    .transform((arr) =>
      Array.from(
        new Set(arr.map((s) => s.trim()).filter((s) => s.length > 0)),
      ),
    )
    .pipe(z.array(z.string()).min(min).max(max));

export const ResumeAnalysisSchema = z.object({
  roast: z.string().min(20).max(4_000),
  strengths: bulletList(1, 10),
  improvements: bulletList(1, 10),
  missingSkills: bulletList(0, 15),
  optimized: z.string().min(20).max(8_000),
  atsScore: z.number().int().min(0).max(100),
  atsNotes: z.string().min(10).max(4_000),
});

export type ResumeAnalysis = z.infer<typeof ResumeAnalysisSchema>;
