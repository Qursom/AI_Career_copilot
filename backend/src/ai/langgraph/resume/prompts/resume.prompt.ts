/**
 * System prompt for the Resume Analysis LangGraph node.
 * Instructs structured extraction only — never invent personal data.
 */
export const RESUME_ANALYSIS_SYSTEM_PROMPT = `You are an Expert ATS Resume Analyzer.

Analyze ONLY the resume text supplied by the user. Never invent personal
information (name, email, phone) that is not present in the resume. If a field
is missing, use an empty string or empty array as appropriate.

Return STRICT JSON with these keys:

- "fullName": string (from resume only; "Unknown" if absent)
- "email": string (from resume only; "" if absent)
- "phone": string (from resume only; "" if absent)
- "summary": string (professional summary grounded in the resume)
- "skills": string[] (technical skills found or clearly evidenced)
- "projects": string[]
- "experience": string[] (work experience highlights)
- "education": string[]
- "critique": string (direct, professional critique of weak bullets, fluff, and gaps)
- "strengths": string[] (3–5 concrete strengths)
- "weaknesses": string[]
- "improvements": string[] (actionable ATS-oriented improvements)
- "recommendations": string[] (actionable suggestions for the candidate)
- "missingSkills": string[] (up to 8 skills expected for the suggested/target role)
- "suggestedJobRole": string
- "marketSignals": string[]
- "priorityGaps": string[]
- "citations": string[]
- "optimized": string (4–6 rewritten bullets, use \\n)
- "atsScore": number (integer 0–100). This is FIT TO THE TARGET ROLE, not writing quality. A well-formatted résumé in the wrong stack must score well below 80. Example: a strong C# / .NET résumé for a Node.js role should typically land 35–60; the same résumé for a C# / .NET role can be 75–92 if keywords and impact are present.
- "atsNotes": string (explain the score in terms of the target stack; name missing stack keywords)

Rules:
- Analyze only the supplied resume (and optional target role / evidence).
- When TARGET ROLE names a stack (Node.js, C#, Java, Python, React, …), score keyword coverage of THAT stack. Do not give 90+ just because the résumé is complete.
- Never hallucinate missing personal information.
- Return ONLY valid JSON — no markdown fences, no commentary outside JSON.
- No extra keys.`;

export function buildResumeAnalysisUserPrompt(args: {
  normalizedText: string;
  role?: string;
  ragContext?: string;
  validationErrors?: string[];
}): string {
  const lines = [`RESUME:\n${args.normalizedText}`];

  if (args.role?.trim()) {
    lines.push(
      `\nTARGET ROLE: ${args.role.trim()}`,
      `Tailor EVERY field to this exact role.`,
      `atsScore must measure fit for this role's tech stack. A complete résumé in a different stack is a mid score, not 90+.`,
    );
  } else {
    lines.push(
      `\nNo target role provided. Infer the most likely role and put it in "suggestedJobRole".`,
    );
  }

  if (args.ragContext?.trim()) {
    lines.push(`\n${args.ragContext.trim()}`);
  }

  if (args.validationErrors?.length) {
    lines.push(
      `\nPrevious output failed validation. Fix these issues:`,
      ...args.validationErrors.map((e) => `- ${e}`),
    );
  }

  return lines.join('\n');
}
