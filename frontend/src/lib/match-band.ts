export type MatchTone = "strong" | "good" | "partial" | "weak";

export function matchBand(score: number): {
  label: string;
  hint: string;
  tone: MatchTone;
} {
  if (score >= 85) {
    return {
      label: "Strong match",
      hint: "Close a few remaining gaps to push this above 90%.",
      tone: "strong",
    };
  }
  if (score >= 70) {
    return {
      label: "Good match",
      hint: "You're in range — fill the gaps below to become a strong fit.",
      tone: "good",
    };
  }
  if (score >= 50) {
    return {
      label: "Partial match",
      hint: "Several requirements are missing. Prioritize the gaps below.",
      tone: "partial",
    };
  }
  return {
    label: "Weak match",
    hint: "This JD is a stretch. Consider a closer role or a rewrite.",
    tone: "weak",
  };
}

export const MATCH_TONE_STYLES: Record<
  MatchTone,
  {
    ring: string;
    chip: string;
    bar: string;
    glow: string;
    row: string;
    rail: string;
    score: string;
  }
> = {
  strong: {
    ring: "#34d399",
    chip: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
    bar: "from-emerald-400 to-teal-400",
    glow: "from-emerald-600/25 via-transparent to-transparent",
    row: "border-emerald-400/25 bg-emerald-500/[0.07] hover:border-emerald-300/40 hover:bg-emerald-500/[0.11]",
    rail: "from-emerald-400 to-teal-500",
    score: "bg-emerald-500/20 text-emerald-100 shadow-[0_0_24px_-6px_rgba(52,211,153,0.7)]",
  },
  good: {
    ring: "#818cf8",
    chip: "bg-indigo-500/15 text-indigo-200 border-indigo-400/30",
    bar: "from-indigo-400 to-violet-400",
    glow: "from-indigo-600/25 via-transparent to-transparent",
    row: "border-indigo-400/25 bg-indigo-500/[0.07] hover:border-indigo-300/40 hover:bg-indigo-500/[0.11]",
    rail: "from-indigo-400 to-violet-500",
    score: "bg-indigo-500/20 text-indigo-100 shadow-[0_0_24px_-6px_rgba(129,140,248,0.7)]",
  },
  partial: {
    ring: "#fbbf24",
    chip: "bg-amber-500/15 text-amber-200 border-amber-400/30",
    bar: "from-amber-400 to-orange-400",
    glow: "from-amber-600/20 via-transparent to-transparent",
    row: "border-amber-400/25 bg-amber-500/[0.07] hover:border-amber-300/40 hover:bg-amber-500/[0.11]",
    rail: "from-amber-400 to-orange-500",
    score: "bg-amber-500/20 text-amber-100 shadow-[0_0_24px_-6px_rgba(251,191,36,0.65)]",
  },
  weak: {
    ring: "#fb7185",
    chip: "bg-rose-500/15 text-rose-200 border-rose-400/30",
    bar: "from-rose-400 to-orange-400",
    glow: "from-rose-600/20 via-transparent to-transparent",
    row: "border-rose-400/25 bg-rose-500/[0.07] hover:border-rose-300/40 hover:bg-rose-500/[0.11]",
    rail: "from-rose-400 to-orange-500",
    score: "bg-rose-500/20 text-rose-100 shadow-[0_0_24px_-6px_rgba(251,113,133,0.7)]",
  },
};

