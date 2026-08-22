import type { ResumeAnalysis } from '../../../../resume/resume.schema';
import type { ResumeAnalysisState, ResumeAnalysisUpdate } from '../state';
import { scoreRoleFit } from '../role-fit';

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Deterministic ATS scoring (0–100) combined with the LLM qualitative score.
 * Weights: Structure 20, Experience 25, Education 10, Content 10, Role fit 35.
 * Role fit is keyword coverage of the target stack, minus a mismatch penalty
 * when the résumé is clearly a different stack (e.g. C# vs Node.js).
 */
export function computeDeterministicAtsScore(
  resume: ResumeAnalysis,
  normalizedText: string,
  role?: string,
): number {
  const text = normalizedText.toLowerCase();

  let structure = 0;
  if (resume.summary?.trim()) structure += 5;
  if (resume.skills.length > 0) structure += 5;
  if (resume.experience.length > 0) structure += 5;
  if (resume.education.length > 0 || resume.projects.length > 0) structure += 5;

  const experience = Math.min(25, resume.experience.length * 8);
  const education = Math.min(10, resume.education.length * 5);

  let content = 0;
  if (normalizedText.length >= 400) content += 4;
  if (normalizedText.length >= 1200) content += 3;
  if (resume.projects.length > 0) content += 3;

  const fit = scoreRoleFit(role, normalizedText, resume.skills);
  let roleFit: number;
  if (fit.target) {
    roleFit = Math.max(0, fit.coverage - fit.mismatchPenalty);
  } else {
    // No stack named in the target role — fall back to generic ATS signals.
    const skills = Math.min(20, resume.skills.length * 2.5);
    const keywordHits = [
      'led',
      'built',
      'designed',
      'implemented',
      'improved',
      'reduced',
      'increased',
      'managed',
      '%',
    ].filter((k) => text.includes(k)).length;
    const keywords = Math.min(15, keywordHits * 1.5);
    roleFit = Math.min(35, skills + keywords);
  }

  return clampScore(
    structure + experience + education + content + roleFit,
  );
}

export function atsEvaluationNode(
  state: ResumeAnalysisState,
): ResumeAnalysisUpdate {
  if (state.error || !state.resume) {
    return {};
  }

  const deterministic = computeDeterministicAtsScore(
    state.resume,
    state.normalizedText ?? '',
    state.role,
  );
  const llmScore = clampScore(state.resume.atsScore);
  const fit = scoreRoleFit(
    state.role,
    state.normalizedText ?? '',
    state.resume.skills,
  );
  // Role-aware checks dominate so a well-formatted résumé in the wrong stack
  // cannot sit at 90+ because the model liked the writing.
  const atsScore = clampScore(0.7 * deterministic + 0.3 * llmScore);

  const mismatchNote =
    fit.target && fit.mismatchPenalty > 0
      ? ` Target stack is ${fit.target.label}${
          fit.resumeStack ? `; résumé looks like ${fit.resumeStack.label}` : ''
        } — score reflects that gap.`
      : '';

  return {
    atsScore,
    resume: {
      ...state.resume,
      atsScore,
      atsNotes:
        (state.resume.atsNotes ||
          `Deterministic ATS checks scored ${deterministic}/100; model scored ${llmScore}/100.`) +
        mismatchNote,
    },
  };
}
