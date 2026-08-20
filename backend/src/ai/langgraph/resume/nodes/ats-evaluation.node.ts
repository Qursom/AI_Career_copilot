import type { ResumeAnalysis } from '../../../../resume/resume.schema';
import type { ResumeAnalysisState, ResumeAnalysisUpdate } from '../state';

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Deterministic ATS scoring (0–100) combined with the LLM qualitative score.
 * Weights: Structure 20, Skills 20, Experience 25, Keywords 15, Education 10, Content 10.
 */
export function computeDeterministicAtsScore(
  resume: ResumeAnalysis,
  normalizedText: string,
): number {
  const text = normalizedText.toLowerCase();

  // Structure (20)
  let structure = 0;
  if (resume.summary?.trim()) structure += 5;
  if (resume.skills.length > 0) structure += 5;
  if (resume.experience.length > 0) structure += 5;
  if (resume.education.length > 0 || resume.projects.length > 0) structure += 5;

  // Skills (20)
  const skills = Math.min(20, resume.skills.length * 2.5);

  // Experience (25)
  const experience = Math.min(25, resume.experience.length * 8);

  // Keywords (15) — action verbs / metrics signals in source text
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
    'aws',
    'typescript',
    'python',
    'react',
    'sql',
  ].filter((k) => text.includes(k)).length;
  const keywords = Math.min(15, keywordHits * 1.5);

  // Education (10)
  const education = Math.min(10, resume.education.length * 5);

  // Content quality (10)
  let content = 0;
  if (normalizedText.length >= 400) content += 4;
  if (normalizedText.length >= 1200) content += 3;
  if (resume.projects.length > 0) content += 3;

  return clampScore(
    structure + skills + experience + keywords + education + content,
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
  );
  const llmScore = clampScore(state.resume.atsScore);
  // Prefer evidence-based score; blend so LLM nuance still matters.
  const atsScore = clampScore(0.55 * deterministic + 0.45 * llmScore);

  return {
    atsScore,
    resume: {
      ...state.resume,
      atsScore,
      atsNotes:
        state.resume.atsNotes ||
        `Deterministic ATS checks scored ${deterministic}/100; model scored ${llmScore}/100.`,
    },
  };
}
