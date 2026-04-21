import type { ReactNode } from "react";

export type BulletTone = "success" | "warning" | "info" | "danger";

const TONES: Record<BulletTone, { chip: string; ring: string }> = {
  success: {
    chip: "bg-emerald-500/15 text-emerald-200",
    ring: "text-emerald-300",
  },
  warning: {
    chip: "bg-amber-500/15 text-amber-200",
    ring: "text-amber-300",
  },
  info: {
    chip: "bg-indigo-500/15 text-indigo-200",
    ring: "text-indigo-300",
  },
  danger: {
    chip: "bg-rose-500/15 text-rose-200",
    ring: "text-rose-300",
  },
};

type Props = {
  title: string;
  tone: BulletTone;
  icon: ReactNode;
  items: string[];
  /** Render each item as a pill instead of a bullet (good for short tags like skills). */
  variant?: "bullets" | "pills";
  emptyHint?: string;
};

export default function BulletCard({
  title,
  tone,
  icon,
  items,
  variant = "bullets",
  emptyHint,
}: Props) {
  const t = TONES[tone];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center ${t.ring}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-hidden="true"
            >
              {icon}
            </svg>
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <span className={`chip ${t.chip}`}>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-white/40 italic">
          {emptyHint ?? "Nothing to flag here."}
        </p>
      ) : variant === "pills" ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((it, i) => (
            <li
              key={i}
              className={`chip ${t.chip} !text-xs !font-medium !py-1 !px-2.5`}
            >
              {it}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2.5">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex gap-3 text-sm text-white/70 leading-relaxed"
            >
              <span className="mt-2 block w-1.5 h-1.5 rounded-full bg-white/30 flex-none" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
