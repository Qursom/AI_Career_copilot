"use client";

import { useState } from "react";
import UploadBox from "@/components/UploadBox";
import ResultCard from "@/components/ResultCard";
import BulletCard from "@/components/BulletCard";
import ErrorBanner from "@/components/ErrorBanner";
import RoleInput from "@/components/RoleInput";
import { api, ApiError, type ResumeAnalysis } from "@/lib/api";

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: ApiError | Error }
  | ({ status: "done" } & ResumeAnalysis);

export default function ResumePage() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [role, setRole] = useState("");

  const handleAnalyze = async (text: string) => {
    setState({ status: "loading" });
    try {
      const data = await api.analyzeResume({
        resume: text,
        role: role.trim() || undefined,
      });
      setState({ status: "done", ...data });
      requestAnimationFrame(() => {
        document
          .getElementById("results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setState({
        status: "error",
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  };

  const isLoading = state.status === "loading";

  return (
    <section className="max-w-5xl mx-auto px-6 pt-10 pb-20">
      <div className="animate-fade-in-up">
        <span className="chip glass text-white/70">Resume Tools</span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
          Roast, rewrite, <span className="text-gradient">and rank it</span>.
        </h1>
        <p className="mt-4 text-white/60 max-w-2xl">
          Paste or upload your resume. In seconds you&apos;ll get an unfiltered
          roast, a rewritten version, strengths, gaps, missing skills, and an
          ATS score grounded with real-world role expectations.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
        <div className="card p-6 space-y-6">
          <RoleInput value={role} onChange={setRole} disabled={isLoading} />

          <div className="h-px bg-white/5" />

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-3 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Your resume
            </h2>
            <UploadBox onAnalyze={handleAnalyze} isAnalyzing={isLoading} />
          </div>
        </div>

        <div id="results" className="space-y-4">
          {state.status === "idle" && <EmptyState />}
          {state.status === "loading" && <LoadingState />}
          {state.status === "error" && (
            <ErrorBanner
              error={state.error}
              onDismiss={() => setState({ status: "idle" })}
            />
          )}
          {state.status === "done" && <DoneView data={state} />}
        </div>
      </div>
    </section>
  );
}

function DoneView({ data }: { data: ResumeAnalysis }) {
  return (
    <>
      <ResultCard
        title="ATS Score"
        content={data.atsNotes}
        tone="score"
        score={data.atsScore}
        icon={
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
            <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z M9 12l2 2 4-4" />
          </svg>
        }
      />

      <ResultCard
        title="AI Roast"
        content={data.roast}
        tone="roast"
        icon={
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
            <path d="M12 2a7 7 0 0 1 7 7c0 4-4 4-4 9H9c0-5-4-5-4-9a7 7 0 0 1 7-7Z M9 22h6" />
          </svg>
        }
      />

      <BulletCard
        title="Strengths"
        tone="success"
        items={data.strengths}
        icon={<path d="M20 6 9 17l-5-5" />}
      />

      <BulletCard
        title="Improvements"
        tone="warning"
        items={data.improvements}
        icon={
          <path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
        }
      />

      <BulletCard
        title="Missing Skills"
        tone="danger"
        items={data.missingSkills}
        variant="pills"
        emptyHint="No major skill gaps detected for this role."
        icon={
          <path d="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        }
      />

      <BulletCard
        title="Market Signals (RAG)"
        tone="info"
        items={data.marketSignals}
        emptyHint="No market evidence retrieved for this run."
        icon={<path d="M3 3v18h18 M7 13l3-3 3 2 4-5" />}
      />

      <BulletCard
        title="Priority Market Gaps"
        tone="warning"
        items={data.priorityGaps}
        emptyHint="No market-priority gaps detected."
        icon={<path d="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />}
      />

      <BulletCard
        title="Evidence Sources"
        tone="info"
        items={data.citations}
        variant="pills"
        emptyHint="No retrieval citations were attached."
        icon={<path d="M12 6v12 M6 12h12" />}
      />

      <ResultCard
        title="Optimized Rewrite"
        content={data.optimized}
        tone="success"
        icon={
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
            <path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
          </svg>
        }
      />
    </>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-14">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-indigo-300"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />
        </svg>
      </div>
      <h3 className="mt-4 font-semibold">Your results will appear here</h3>
      <p className="mt-1 text-sm text-white/50 max-w-sm">
        Pick a target role (optional), paste or upload your resume, and hit{" "}
        <span className="text-white/80">Analyze resume</span>.
      </p>
    </div>
  );
}

function LoadingState() {
  const rows = [0, 1, 2, 3];
  return (
    <div className="space-y-4">
      {rows.map((i) => (
        <div key={i} className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/5 animate-pulse" />
              <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="h-5 w-16 rounded-full bg-white/5 animate-pulse" />
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
            <div className="h-3 w-11/12 rounded bg-white/5 animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-white/5 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
