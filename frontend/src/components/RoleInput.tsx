"use client";

const SUGGESTIONS = [
  "Senior Frontend Engineer",
  "Full-Stack Engineer",
  "Backend Engineer",
  "Engineering Manager",
  "Product Designer",
  "Data Engineer",
  "ML Engineer",
  "Product Manager",
];

const MAX_LEN = 120;

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function RoleInput({ value, onChange, disabled }: Props) {
  const trimmed = value.trim();
  const hasValue = trimmed.length > 0;
  const isSuggestionActive = (s: string) =>
    trimmed.toLowerCase() === s.toLowerCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor="role-input"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/50"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400" />
          Target role
          <span className="normal-case tracking-normal text-[11px] font-normal text-white/30">
            optional — sharpens missing skills & ATS score
          </span>
        </label>
        {hasValue && (
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={disabled}
            className="text-[11px] text-white/40 hover:text-white/70 disabled:opacity-40"
          >
            Clear
          </button>
        )}
      </div>

      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M3 21h18 M5 21V8l7-5 7 5v13 M9 9h.01 M15 9h.01 M9 13h.01 M15 13h.01 M9 17h.01 M15 17h.01" />
          </svg>
        </span>
        <input
          id="role-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_LEN))}
          placeholder="e.g. Senior Frontend Engineer"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl border border-white/10 bg-white/[0.02] py-2.5 pl-9 pr-16 text-sm placeholder:text-white/30 focus:border-indigo-400/60 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition disabled:opacity-60"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/30">
          {value.length}/{MAX_LEN}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => {
          const active = isSuggestionActive(s);
          return (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => onChange(active ? "" : s)}
              className={`chip text-[11px] transition ${
                active
                  ? "bg-indigo-500/25 text-indigo-100 border-indigo-400/40"
                  : "glass text-white/55 hover:text-white/80 hover:bg-white/[0.06]"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
