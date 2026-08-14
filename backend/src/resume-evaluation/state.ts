import { z } from 'zod';
import { StateSchema } from '@langchain/langgraph';
import { ParsedJobSchema, ParsedResumeSchema, ResumeEvaluationResultSchema, ResumeEvaluationSchema, CoverLetterEvaluationSchema } from './schemas';

const RetrievedSchema = z.object({
  content: z.string(),
  score: z.number(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const ResumeEvaluationState = new StateSchema({
  resumeText: z.string(),
  jobDescription: z.string(),
  coverLetter: z.string().optional(),
  targetRole: z.string().optional(),
  parsedResume: ParsedResumeSchema.optional(),
  parsedJob: ParsedJobSchema.optional(),
  candidateSkills: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  ragQuery: z.string().optional(),
  ragDocuments: z.array(RetrievedSchema).optional(),
  marketSignals: z.array(z.string()).optional(),
  priorityGaps: z.array(z.string()).optional(),
  comparison: z.object({ matchedRequiredSkills: z.array(z.string()), missingRequiredSkills: z.array(z.string()), matchedPreferredSkills: z.array(z.string()), keywordCoverage: z.number(), experienceAlignment: z.number() }).optional(),
  resumeEvaluation: ResumeEvaluationSchema.optional(),
  coverLetterEvaluation: CoverLetterEvaluationSchema.optional(),
  finalResult: ResumeEvaluationResultSchema.optional(),
  errors: z.array(z.string()).default([]),
  requestId: z.string().optional(),
});

export type ResumeEvaluationStateType = typeof ResumeEvaluationState.State;
export type ResumeEvaluationUpdate = typeof ResumeEvaluationState.Update;
