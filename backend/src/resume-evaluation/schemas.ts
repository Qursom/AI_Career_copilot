import { z } from 'zod';

export const ParsedResumeSchema = z.object({
  headline: z.string(), summary: z.string(), yearsOfExperience: z.number().nullable(),
  skills: z.array(z.string()), technologies: z.array(z.string()),
  experiences: z.array(z.object({ company: z.string(), title: z.string(), duration: z.string().optional(), responsibilities: z.array(z.string()), achievements: z.array(z.string()), technologies: z.array(z.string()) })),
  projects: z.array(z.object({ name: z.string(), description: z.string(), technologies: z.array(z.string()), achievements: z.array(z.string()) })),
  education: z.array(z.string()), certifications: z.array(z.string()),
});

export const ParsedJobSchema = z.object({
  role: z.string(), seniority: z.string(), requiredSkills: z.array(z.string()), preferredSkills: z.array(z.string()), responsibilities: z.array(z.string()), minimumExperience: z.number().nullable(), educationRequirements: z.array(z.string()), keywords: z.array(z.string()), softSkills: z.array(z.string()), domainExperience: z.array(z.string()),
});

export const ResumeEvaluationSchema = z.object({
  score: z.number().min(0).max(100), atsScore: z.number().min(0).max(100), strengths: z.array(z.string()), weaknesses: z.array(z.string()), missingSkills: z.array(z.string()), missingKeywords: z.array(z.string()), experienceAlignment: z.array(z.string()), atsIssues: z.array(z.string()), recruiterConcerns: z.array(z.string()), strongSections: z.array(z.string()), weakSections: z.array(z.string()),
});

export const CoverLetterEvaluationSchema = z.object({
  score: z.number().min(0).max(100), strengths: z.array(z.string()), weaknesses: z.array(z.string()), personalizationScore: z.number().min(0).max(100), relevanceScore: z.number().min(0).max(100), toneScore: z.number().min(0).max(100), issues: z.array(z.string()), suggestedChanges: z.array(z.string()),
});

export const QuickFixSchema = z.object({
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']), section: z.enum(['SUMMARY','EXPERIENCE','SKILLS','PROJECT','COVER_LETTER','ATS']), issue: z.string(), recommendation: z.string(), before: z.string().optional(), after: z.string().optional(), reason: z.string(),
});

export const ResumeEvaluationResultSchema = z.object({
  verdict: z.enum(['SHORTLIST','MAYBE','REJECT']), overallScore: z.number().min(0).max(100), confidence: z.number().min(0).max(1), summary: z.string(),
  resume: z.object({ score: z.number(), atsScore: z.number(), strengths: z.array(z.string()), weaknesses: z.array(z.string()), missingSkills: z.array(z.string()), missingKeywords: z.array(z.string()), atsIssues: z.array(z.string()) }),
  coverLetter: z.object({ score: z.number(), strengths: z.array(z.string()), weaknesses: z.array(z.string()), issues: z.array(z.string()) }).optional(),
  match: z.object({ requiredSkillsMatched: z.array(z.string()), requiredSkillsMissing: z.array(z.string()), preferredSkillsMatched: z.array(z.string()), keywordCoverage: z.number(), experienceAlignment: z.number() }),
  marketSignals: z.array(z.string()), priorityGaps: z.array(z.string()), recruiterPerspective: z.string(), quickFixes: z.array(QuickFixSchema), citations: z.array(z.object({ title: z.string(), url: z.string().optional(), evidence: z.string().optional() })),
});

export type ParsedResume = z.infer<typeof ParsedResumeSchema>;
export type ParsedJob = z.infer<typeof ParsedJobSchema>;
export type ResumeEvaluation = z.infer<typeof ResumeEvaluationSchema>;
export type CoverLetterEvaluation = z.infer<typeof CoverLetterEvaluationSchema>;
export type ResumeEvaluationResult = z.infer<typeof ResumeEvaluationResultSchema>;
export type QuickFix = z.infer<typeof QuickFixSchema>;
