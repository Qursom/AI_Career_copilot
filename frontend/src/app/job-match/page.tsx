"use client";

import { useState } from "react";
import ErrorBanner from "@/components/ErrorBanner";
import BulletCard from "@/components/BulletCard";
import { api, ApiError, type MatchResult } from "@/lib/api";

export default function JobMatchPage() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);

  const canMatch =
    resume.trim().length > 50 && jd.trim().length > 50 && !loading;

  const handleMatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.scoreJobMatch({
        jobDescription: jd,
        resume,
      });
      setResult(data);
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
        <p className="mt-4 text-white/60 max-w-2xl">
          Paste a job description and your resume. We&apos;ll score the match,
          pull out your strongest signals, and flag gaps to fix before you hit
          submit, grounded by retrieved public labor-market role data.
        </p>
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
        <TextArea
          label="Your resume"
          hint="Plain text works best."
          value={resume}
          onChange={setResume}
          placeholder="Jane Doe — Senior Frontend Engineer…"
          accent="from-indigo-500/30 to-violet-500/10"
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

      {error && (
        <div className="mt-8">
          <ErrorBanner error={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {result && (
        <div className="mt-10 grid gap-4 md:grid-cols-[0.8fr_1fr]">
          <ScoreCard score={result.score} />
          <div className="space-y-4">
            <BulletCard
              title="Strengths"
              tone="success"
              icon={
                <path d="M20 6 9 17l-5-5" />
              }
              items={result.strengths}
            />
            <BulletCard
              title="Gaps"
              tone="warning"
              icon={
                <path d="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              }
              items={result.gaps}
            />
            <BulletCard
              title="Market Signals (RAG)"
              tone="info"
              icon={<path d="M3 3v18h18 M7 13l3-3 3 2 4-5" />}
              items={result.marketSignals}
              emptyHint="No market evidence retrieved for this request."
            />
            <BulletCard
              title="Priority Market Gaps"
              tone="warning"
              icon={
                <path d="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              }
              items={result.priorityGaps}
              emptyHint="No market-priority gaps detected."
            />
            <BulletCard
              title="Suggested edits"
              tone="info"
              icon={
                <path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
              }
              items={result.suggestions}
            />
            <BulletCard
              title="Evidence Sources"
              tone="info"
              icon={<path d="M12 6v12 M6 12h12" />}
              items={result.citations}
              variant="pills"
              emptyHint="No retrieval citations attached."
            />
          </div>
        </div>
      )}
    </section>
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

function ScoreCard({ score }: { score: number }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="card flex flex-col items-center justify-center text-center py-10">
      <span className="chip bg-indigo-500/15 text-indigo-200">Match score</span>
      <div className="relative mt-5 w-36 h-36">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <defs>
            <linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          <circle
            cx="70"
            cy="70"
            r={radius}
            strokeWidth="10"
            stroke="rgba(255,255,255,0.06)"
            fill="none"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            strokeWidth="10"
            stroke="url(#ring)"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div>
            <span className="text-4xl font-semibold">{score}</span>
            <span className="text-sm text-white/50">%</span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-white/70 font-medium">Strong match</p>
      <p className="mt-1 text-xs text-white/40 max-w-[14rem]">
        Close a few gaps below to push this above 90%.
      </p>
    </div>
  );
}

