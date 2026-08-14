import { VerdictService } from './verdict.service';

describe('VerdictService', () => {
  const service = new VerdictService();
  const base = { score: 90, atsScore: 90, strengths: [], weaknesses: [], missingSkills: [], missingKeywords: [], experienceAlignment: [], atsIssues: [], recruiterConcerns: [], strongSections: [], weakSections: [] };
  it('returns SHORTLIST for strong alignment', () => expect(service.calculate({ resume: base, requiredMatched: ['Node.js','TypeScript'], requiredMissing: [], keywordCoverage: 95, experienceAlignment: 100 }).verdict).toBe('SHORTLIST'));
  it('returns MAYBE when critical required skills are missing', () => expect(service.calculate({ resume: base, requiredMatched: ['Node.js'], requiredMissing: ['Kubernetes','AWS'], keywordCoverage: 70, experienceAlignment: 90 }).verdict).toBe('MAYBE'));
  it('returns REJECT for low alignment', () => expect(service.calculate({ resume: { ...base, atsScore: 30 }, requiredMatched: [], requiredMissing: ['Node.js','TypeScript','AWS'], keywordCoverage: 20, experienceAlignment: 20 }).verdict).toBe('REJECT'));
});
