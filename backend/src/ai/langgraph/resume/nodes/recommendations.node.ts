import type { ResumeAnalysis } from '../../../../resume/resume.schema';
import type { ResumeAnalysisState, ResumeAnalysisUpdate } from '../state';

/**
 * Build actionable recommendations grounded in extracted resume data.
 */
export function buildRecommendations(resume: ResumeAnalysis): string[] {
  const out: string[] = [];

  if (!resume.summary?.trim() || resume.summary.length < 80) {
    out.push(
      'Improve professional summary with role focus and measurable impact.',
    );
  }
  if (resume.experience.length === 0) {
    out.push(
      'Add work experience with clear role titles, dates, and outcomes.',
    );
  } else if (
    !resume.experience.some((e) => /\d|%|increased|reduced|led|built/i.test(e))
  ) {
    out.push(
      'Strengthen experience bullet points with measurable achievements.',
    );
  }
  if (resume.skills.length < 5) {
    out.push('Expand technical skills section with role-relevant keywords.');
  }
  if (resume.missingSkills.length > 0) {
    out.push(
      `Add missing technical skills where credible: ${resume.missingSkills.slice(0, 4).join(', ')}.`,
    );
  }
  if (resume.projects.length === 0) {
    out.push('Improve project descriptions or add 1–2 relevant projects.');
  }
  if (resume.atsScore < 70) {
    out.push(
      'Improve keyword coverage and ATS-friendly formatting for the target role.',
    );
  }
  if (!resume.education.length) {
    out.push('Include education details if relevant to the target role.');
  }

  for (const r of resume.recommendations ?? []) {
    if (r.trim() && !out.includes(r.trim())) {
      out.push(r.trim());
    }
  }
  for (const r of resume.improvements ?? []) {
    if (r.trim() && !out.includes(r.trim()) && out.length < 12) {
      out.push(r.trim());
    }
  }

  return out.slice(0, 12);
}

export function recommendationsNode(
  state: ResumeAnalysisState,
): ResumeAnalysisUpdate {
  if (state.error || !state.resume) {
    return {};
  }

  const recommendations = buildRecommendations(state.resume);
  return {
    recommendations,
    resume: {
      ...state.resume,
      recommendations,
    },
  };
}
