export function matchBand(score: number): { label: string; hint: string } {
  if (score >= 85) {
    return {
      label: "Strong match",
      hint: "Close a few remaining gaps to push this above 90%.",
    };
  }
  if (score >= 70) {
    return {
      label: "Good match",
      hint: "You're in range — fill the gaps below to become a strong fit.",
    };
  }
  if (score >= 50) {
    return {
      label: "Partial match",
      hint: "Several requirements are missing. Prioritize the gaps below.",
    };
  }
  return {
    label: "Weak match",
    hint: "This JD is a stretch. Consider a closer role or a rewrite.",
  };
}
