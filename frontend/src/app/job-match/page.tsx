"use client";

import { useEffect, useState } from "react";
import ErrorBanner, { CoinsEmptyCard, isCoinsError } from "@/components/ErrorBanner";
import BulletCard from "@/components/BulletCard";
import RequireAuth from "@/components/RequireAuth";
import ResumeTextArea from "@/components/ResumeTextArea";
import {
  api,
  ApiError,
  type AuthHeaders,
  type JobMatchDetail,
  type JobMatchHistoryItem,
  type MatchResult,
  type UserProfile,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { MATCH_TONE_STYLES, matchBand } from "@/lib/match-band";

export default function JobMatchPage() {
  return (
    <RequireAuth
      title="Sign in to match jobs"
      description="Job matches are scored against your AI Career copilot account so you can pick them back up later."
    >
      <JobMatchTool />
    </RequireAuth>
  );
}

function JobMatchTool() {
  const { user, devUserId, refreshUser } = useAuth();
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [history, setHistory] = useState<JobMatchHistoryItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [historyOpen, setHistoryOpen] = useState<JobMatchDetail | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);

  // Identity normally travels in the HTTP-only session cookie.
  const authHeaders = (): AuthHeaders | undefined =>
    devUserId ? { userId: devUserId } : undefined;

  // Restore the user's most recent match so a refresh does not lose it.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const auth = authHeaders();
      try {
        const me = await api.getMe(auth);
        if (!cancelled) setProfile(me);
      } catch {
        /* first visit */
      }
      try {
        const previous = await api.getMyJobMatch(auth);
        if (!cancelled) setResult(previous);
      } catch {
        /* nothing scored yet */
      }
      try {
        const rows = await api.getMyJobMatchHistory(auth);
        if (!cancelled) setHistory(rows);
      } catch {
        /* history is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, devUserId]);

  const canMatch =
    resume.trim().length > 50 && jd.trim().length > 50 && !loading;

  const openHistory = async (contentHash: string) => {
    setHistoryLoading(true);
    setError(null);
    try {
      const detail = await api.getJobMatchDetail(contentHash, authHeaders());
      setHistoryOpen(detail);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleMatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = authHeaders();
      const data = await api.scoreJobMatch(
        {
          jobDescription: jd,
          resume,
        },
        auth,
      );
      setResult(data);
      requestAnimationFrame(() => {
        document
          .getElementById("match-results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      if (typeof data.interviewCoins === "number") {
        setProfile((p) =>
          p
            ? { ...p, interviewCoins: data.interviewCoins ?? p.interviewCoins }
            : p,
        );
      }
      void refreshUser().catch(() => {});
      try {
        setHistory(await api.getMyJobMatchHistory(auth));
      } catch {
        /* keep existing history */
      }
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-6 pt-10 pb-20">
      <div className="animate-fade-in-up">
        <span className="chip glass text-white/70">Job Match</span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
          Does your resume <span className="text-gradient">actually match</span>?
        </h1>
        <p className="mt-4 text-white/60 max-w-2xl leading-relaxed">
          Paste a job description and your resume. Get a match score, your
          strongest signals, and the gaps to close before you hit submit.
        </p>
        {profile && (
          <p className="mt-3 text-sm text-indigo-200/80">
            Total coins: <strong>{profile.interviewCoins}</strong> (each
            new score costs {profile.jobMatchCoinCost ?? 10}; identical
            JD+resume pairs are free)
          </p>
        )}
        {profile &&
          profile.interviewCoins < (profile.jobMatchCoinCost ?? 10) && (
            <div className="mt-6">
              <CoinsEmptyCard cost={profile.jobMatchCoinCost ?? 10} />
            </div>
          )}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <TextArea
          label="Job description"
          hint="Paste the full JD — title, responsibilities, requirements."
          value={jd}
          onChange={setJd}
          placeholder="We are looking for a Senior Frontend Engineer to join…"
          accent="from-blue-500/30 to-cyan-500/10"
        />
        <ResumeTextArea
          label="Your resume"
          hint="Upload a PDF or paste text."
          value={resume}
          onChange={setResume}
          placeholder="Jane Doe — Senior Frontend Engineer…"
          accent="from-indigo-500/30 to-violet-500/10"
          disabled={loading}
          extractPdf={async (file) => {
            const parsed = await api.extractResumePdf(file, authHeaders());
            return parsed.text;
          }}
        />
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-white/40">
          {resume.trim().length > 0 || jd.trim().length > 0
            ? `${resume.trim().split(/\s+/).length} + ${jd.trim().split(/\s+/).length} words`
            : "Minimum ~50 chars per field"}
        </p>
        <button
          type="button"
          disabled={!canMatch}
          onClick={handleMatch}
          className="btn-primary"
        >
          {loading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeOpacity="0.3"
                  strokeWidth="3"
                />
                <path
                  d="M22 12a10 10 0 0 1-10 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              Scoring match…
            </>
          ) : (
            <>
              Calculate match
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>

      {error &&
        !(
          isCoinsError(error) &&
          profile &&
          profile.interviewCoins < (profile.jobMatchCoinCost ?? 10)
        ) && (
        <div className="mt-8">
          <ErrorBanner error={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {loading && <MatchLoading />}
      {result && !loading && <MatchResults result={result} />}

      {history.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50 mb-3">
            Recent matches
          </h2>
          <ul className="space-y-3">
            {history.map((row) => {
              const band = matchBand(row.score);
              const tone = MATCH_TONE_STYLES[band.tone];
              return (
                <li
                  key={row.contentHash}
                  className={`relative overflow-hidden rounded-2xl border px-4 py-3.5 flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 ${tone.row}`}
                  onClick={() => void openHistory(row.contentHash)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void openHistory(row.contentHash);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${tone.rail}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 pl-2">
                    <p className="text-sm font-medium text-white/90 line-clamp-2">
                      {row.jobPreview || "Job description"}
                    </p>
                    <p className="text-xs text-white/50 mt-1 flex flex-wrap items-center gap-2">
                      <span className={`chip border ${tone.chip} normal-case tracking-normal`}>
                        {band.label}
                      </span>
                      <span>
                        {new Date(row.createdAt).toLocaleString()}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-2xl px-3 py-2 text-lg font-semibold tabular-nums ${tone.score}`}
                  >
                    {row.score}
                    <span className="text-[11px] font-medium opacity-70">%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {historyLoading && (
        <p className="mt-3 text-xs text-white/40">Opening saved match…</p>
      )}
      {historyOpen && (
        <HistoryModal
          detail={historyOpen}
          onClose={() => setHistoryOpen(null)}
        />
      )}
    </section>
  );
}

function HistoryModal({
  detail,
  onClose,
}: {
  detail: JobMatchDetail;
  onClose: () => void;
}) {
  const band = matchBand(detail.score);
  const tone = MATCH_TONE_STYLES[band.tone];
  const missing =
    !detail.jobDescription.trim() && !detail.resume.trim();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0b0b14] shadow-2xl">
        <div
          className={`h-1 w-full bg-gradient-to-r ${tone.bar}`}
          aria-hidden="true"
        />
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p id="history-modal-title" className="text-sm font-semibold">
              Saved match
            </p>
            <p className="mt-1 truncate text-sm text-white/80">
              {detail.jobPreview || "Job description"}
            </p>
            <p className="mt-1 text-xs text-white/45">
              {new Date(detail.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`rounded-2xl px-3 py-2 text-sm font-semibold tabular-nums ${tone.score}`}
            >
              {detail.score}%
              <span className="ml-1 text-[11px] font-medium opacity-80">
                {band.label}
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </div>
        {missing ? (
          <p className="px-6 py-10 text-sm text-white/50">
            This match was saved before we stored the full job description and
            resume. Run Calculate match again on this pair to keep the full
            text.
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6">
            <HistoryPane
              title="Job description"
              text={detail.jobDescription}
              theme="jd"
            />
            <HistoryPane
              title="Resume used"
              text={detail.resume}
              theme="resume"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryPane({
  title,
  text,
  theme,
}: {
  title: string;
  text: string;
  theme: "jd" | "resume";
}) {
  const styles =
    theme === "jd"
      ? {
          wrap: "border-cyan-400/25 bg-cyan-500/[0.06]",
          bar: "from-cyan-400 to-blue-500",
          label: "text-cyan-200",
        }
      : {
          wrap: "border-violet-400/25 bg-violet-500/[0.06]",
          bar: "from-violet-400 to-fuchsia-500",
          label: "text-violet-200",
        };

  return (
    <div
      className={`flex min-h-[240px] flex-col overflow-hidden rounded-2xl border ${styles.wrap}`}
    >
      <div className={`h-1 bg-gradient-to-r ${styles.bar}`} />
      <div className="flex items-center justify-between px-4 py-3">
        <h3
          className={`text-xs font-semibold uppercase tracking-widest ${styles.label}`}
        >
          {title}
        </h3>
        <span className="text-[11px] text-white/40">
          {text.trim() ? `${text.trim().split(/\s+/).length} words` : "Empty"}
        </span>
      </div>
      <pre className="flex-1 overflow-auto whitespace-pre-wrap px-4 pb-4 font-sans text-sm leading-relaxed text-white/80">
        {text.trim() || "Not stored for this match."}
      </pre>
    </div>
  );
}

function MatchLoading() {
  return (
    <div id="match-results" className="mt-12 space-y-4 animate-fade-in-up">
      <div className="card p-8">
        <p className="text-sm text-indigo-200/90 animate-pulse">
          Scoring your resume against this job…
        </p>
        <div className="mt-5 h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 animate-pulse" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card h-40">
            <div className="h-4 w-28 rounded bg-white/5 animate-pulse" />
            <div className="mt-6 space-y-2">
              <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-5/6 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchResults({ result }: { result: MatchResult }) {
  const band = matchBand(result.score);
  const tone = MATCH_TONE_STYLES[band.tone];
  const radius = 58;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (result.score / 100) * circ;

  return (
    <div id="match-results" className="mt-12 space-y-5 animate-fade-in-up">
      <div
        className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${tone.glow} p-6 sm:p-8`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-8">
          <div className="relative mx-auto lg:mx-0 w-44 h-44 shrink-0">
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
              <circle
                cx="70"
                cy="70"
                r={radius}
                strokeWidth="11"
                stroke="rgba(255,255,255,0.08)"
                fill="none"
              />
              <circle
                cx="70"
                cy="70"
                r={radius}
                strokeWidth="11"
                stroke={tone.ring}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 700ms ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-semibold tabular-nums tracking-tight">
                {result.score}
              </span>
              <span className="text-sm text-white/45">match</span>
            </div>
          </div>

          <div className="flex-1 min-w-0 text-center lg:text-left">
            <span className={`chip ${tone.chip}`}>{band.label}</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
              Here is how you stack up
            </h2>
            <p className="mt-2 text-sm text-white/55 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {band.hint}
            </p>
            {result.cached ? (
              <p className="mt-3 text-[11px] text-indigo-200/70">
                Returned from cache — no coins charged
              </p>
            ) : null}

            <div className="mt-6 grid grid-cols-3 gap-3 max-w-md mx-auto lg:mx-0">
              <StatChip
                label="Strengths"
                value={result.strengths.length}
                className="text-emerald-200"
              />
              <StatChip
                label="Gaps"
                value={result.gaps.length}
                className="text-amber-200"
              />
              <StatChip
                label="Next steps"
                value={result.suggestions.length}
                className="text-indigo-200"
              />
            </div>
            <div className="mt-5 h-1.5 rounded-full bg-white/10 overflow-hidden max-w-md mx-auto lg:mx-0">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
                style={{ width: `${Math.max(4, Math.min(100, result.score))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {result.requirements && result.requirements.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-white/50">
            Requirement match
          </h3>
          <ul className="mt-4 space-y-2">
            {result.requirements.map((row) => (
              <li
                key={`${row.importance}-${row.requirement}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm"
              >
                <span className="min-w-0 text-white/80">
                  {row.requirement}
                  <span className="ml-2 text-[11px] uppercase tracking-widest text-white/35">
                    {row.importance}
                  </span>
                </span>
                <span
                  className={`chip text-[11px] ${
                    row.status === "matched"
                      ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
                      : row.status === "partial"
                        ? "bg-amber-500/15 text-amber-200 border-amber-400/30"
                        : row.status === "unknown"
                          ? "bg-white/10 text-white/60 border-white/15"
                          : "bg-rose-500/15 text-rose-200 border-rose-400/30"
                  }`}
                >
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <InsightList
          title="What already lands"
          empty="No clear strengths extracted for this JD."
          items={result.strengths}
          accent="emerald"
        />
        <InsightList
          title="Gaps to close"
          empty="No major gaps flagged."
          items={result.gaps}
          accent="amber"
        />
      </div>

      {result.priorityGaps.length > 0 && (
        <div className="card relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-400/40 to-transparent" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-amber-200/80">
            Fix these first
          </h3>
          <ol className="mt-4 space-y-3">
            {result.priorityGaps.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-white/75 leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-semibold text-amber-200">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-indigo-200/80">
            Suggested edits
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {result.suggestions.map((item, i) => (
              <li
                key={i}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/70 leading-relaxed"
              >
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-white/35">
                  Edit {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <BulletCard
          title="Market signals"
          tone="info"
          icon={<path d="M3 3v18h18 M7 13l3-3 3 2 4-5" />}
          items={result.marketSignals}
          emptyHint="No market evidence retrieved for this request."
        />
        <BulletCard
          title="Evidence sources"
          tone="info"
          icon={<path d="M12 6v12 M6 12h12" />}
          items={result.citations}
          variant="pills"
          emptyHint="No retrieval citations attached."
        />
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-center">
      <p className={`text-xl font-semibold tabular-nums ${className}`}>{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </p>
    </div>
  );
}

function InsightList({
  title,
  items,
  empty,
  accent,
}: {
  title: string;
  items: string[];
  empty: string;
  accent: "emerald" | "amber";
}) {
  const dot =
    accent === "emerald" ? "bg-emerald-400/80" : "bg-amber-400/80";
  const head =
    accent === "emerald" ? "text-emerald-200/85" : "text-amber-200/85";

  return (
    <div className="card h-full">
      <h3 className={`text-sm font-semibold uppercase tracking-widest ${head}`}>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-white/40 italic">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-white/75 leading-relaxed">
              <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TextArea({
  label,
  hint,
  value,
  onChange,
  placeholder,
  accent,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  accent: string;
}) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent}`}
      />
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-white/80">{label}</label>
        <span className="text-[11px] text-white/40">{hint}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-56 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm font-mono leading-relaxed placeholder:text-white/30 focus:border-indigo-400/60 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
      />
    </div>
  );
}


