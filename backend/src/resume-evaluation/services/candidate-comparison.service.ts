import { Injectable } from '@nestjs/common';
import type { ParsedJob, ParsedResume } from '../schemas';

@Injectable()
export class CandidateComparisonService {
  compare(resume: ParsedResume, job: ParsedJob) {
    const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9+#.]/g, ' ').replace(/\s+/g, ' ').trim();
    const candidate = new Set([...resume.skills, ...resume.technologies].map(normalize));
    const has = (skill: string) => { const n = normalize(skill); return [...candidate].some((x) => x === n || x.includes(n) || n.includes(x)); };
    const matchedRequiredSkills = job.requiredSkills.filter(has);
    const missingRequiredSkills = job.requiredSkills.filter((s) => !has(s));
    const matchedPreferredSkills = job.preferredSkills.filter(has);
    const allKeywords = [...new Set([...job.keywords, ...job.requiredSkills].map(normalize).filter(Boolean))];
    const keywordCoverage = allKeywords.length ? Math.round(allKeywords.filter((k) => has(k)).length / allKeywords.length * 100) : 100;
    const years = resume.yearsOfExperience ?? 0;
    const experienceAlignment = job.minimumExperience == null ? 100 : Math.round(Math.min(100, years / Math.max(1, job.minimumExperience) * 100));
    return { matchedRequiredSkills, missingRequiredSkills, matchedPreferredSkills, keywordCoverage, experienceAlignment };
  }
}
