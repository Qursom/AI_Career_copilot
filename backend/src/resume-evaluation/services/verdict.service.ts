import { Injectable } from '@nestjs/common';
import type { CoverLetterEvaluation, ResumeEvaluation } from '../schemas';

export type Verdict = 'SHORTLIST' | 'MAYBE' | 'REJECT';

@Injectable()
export class VerdictService {
  calculate(args: { resume: ResumeEvaluation; requiredMatched: string[]; requiredMissing: string[]; keywordCoverage: number; experienceAlignment: number; coverLetter?: CoverLetterEvaluation; minimumExperienceRequired?: number; candidateYears?: number | null }) {
    const requiredTotal = args.requiredMatched.length + args.requiredMissing.length;
    const requiredScore = requiredTotal ? (args.requiredMatched.length / requiredTotal) * 100 : 100;
    const coverScore = args.coverLetter?.score ?? null;
    const hasCover = coverScore !== null;
    const weights = hasCover ? { match: .4, skills: .2, experience: .15, ats: .15, cover: .1 } : { match: .45, skills: .22, experience: .17, ats: .16 };
    let score = args.experienceAlignment * weights.experience + args.resume.atsScore * weights.ats + requiredScore * weights.skills + args.keywordCoverage * weights.match;
    if (hasCover) score += (coverScore ?? 0) * weights.cover;
    score = Math.round(Math.max(0, Math.min(100, score)));
    let verdict: Verdict = score >= 85 ? 'SHORTLIST' : score >= 65 ? 'MAYBE' : 'REJECT';
    if (args.minimumExperienceRequired != null && args.candidateYears != null && args.candidateYears < args.minimumExperienceRequired) verdict = verdict === 'SHORTLIST' ? 'MAYBE' : verdict;
    if (requiredTotal && args.requiredMissing.length / requiredTotal >= .5 && verdict === 'SHORTLIST') verdict = 'MAYBE';
    const confidence = Math.min(.99, Math.max(.5, .55 + Math.abs(score - 75) / 100));
    return { verdict, overallScore: score, confidence: Number(confidence.toFixed(2)), reasons: args.requiredMissing.slice(0, 3).map((s) => `Missing required skill: ${s}`) };
  }
}
