import type { ReactNode } from "react";

type Tone = "default" | "roast" | "success" | "warning" | "score";

type ResultCardProps = {
  title: string;
  content: string;
  tone?: Tone;
  icon?: ReactNode;
  score?: number;
};

const TONE_STYLES: Record<
  Tone,
  { accent: string; chip: string; chipLabel: string }
> = {
  default: {
    accent: "from-white/10 to-white/5",
    chip: "bg-white/10 text-white/70",
    chipLabel: "Result",
  },
  roast: {
    accent: "from-rose-500/20 to-orange-500/10",
    chip: "bg-rose-500/15 text-rose-200",
    chipLabel: "Roast",
  },
  success: {
    accent: "from-emerald-500/20 to-teal-500/10",
    chip: "bg-emerald-500/15 text-emerald-200",
    chipLabel: "Optimized",
  },
  warning: {
    accent: "from-amber-500/20 to-yellow-500/10",
    chip: "bg-amber-500/15 text-amber-200",
    chipLabel: "Review",
  },
  score: {
    accent: "from-indigo-500/25 to-violet-500/10",
    chip: "bg-indigo-500/15 text-indigo-200",
    chipLabel: "Score",
  },
};

export default function ResultCard({
  title,
  content,
  tone = "default",
  icon,
  score,
}: ResultCardProps) {
  const s = TONE_STYLES[tone];
  return (
    <div className="card relative overflow-hidden">
      <div
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${s.accent}`}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
              {icon}
            </div>
          )}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <span className={`chip ${s.chip}`}>{s.chipLabel}</span>
      </div>

      {typeof score === "number" && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-5xl font-semibold tracking-tight">
              {score}
              <span className="text-xl text-white/40">/100</span>
            </span>
            <span className="text-xs text-white/40">
              {score >= 80
                ? "Excellent"
                : score >= 60
                  ? "Solid"
                  : score >= 40
                    ? "Needs work"
                    : "Rewrite suggested"}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-blue-400 transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
            />
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-white/70 whitespace-pre-line leading-relaxed">
        {content}
      </p>
    </div>
  );
}
