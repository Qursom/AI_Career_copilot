import { CandidateComparisonService } from './candidate-comparison.service';

describe('CandidateComparisonService', () => {
  it('matches skills and calculates coverage deterministically', () => {
    const service = new CandidateComparisonService();
    const result = service.compare({ headline:'',summary:'',yearsOfExperience:5,skills:['Node.js','TypeScript'],technologies:['PostgreSQL'],experiences:[],projects:[],education:[],certifications:[] }, { role:'Senior Backend Engineer',seniority:'Senior',requiredSkills:['Node.js','TypeScript','AWS'],preferredSkills:['Docker'],responsibilities:[],minimumExperience:4,educationRequirements:[],keywords:['Node.js','AWS'],softSkills:[],domainExperience:[] });
    expect(result.matchedRequiredSkills).toEqual(['Node.js','TypeScript']);
    expect(result.missingRequiredSkills).toEqual(['AWS']);
    expect(result.keywordCoverage).toBe(50);
    expect(result.experienceAlignment).toBe(100);
  });
});
