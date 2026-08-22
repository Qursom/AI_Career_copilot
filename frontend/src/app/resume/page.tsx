"use client";

import { useEffect, useState } from "react";
import UploadBox from "@/components/UploadBox";
import ResultCard from "@/components/ResultCard";
import BulletCard from "@/components/BulletCard";
import ErrorBanner, { CoinsEmptyCard, isCoinsError } from "@/components/ErrorBanner";
import RequireAuth from "@/components/RequireAuth";
import RoleInput from "@/components/RoleInput";
import {
  api,
  ApiError,
  type AuthHeaders,
  type ResumeAnalysis,
  type UserProfile,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; step?: string; percent?: number }
  | { status: "error"; error: ApiError | Error }
  | ({ status: "done" } & ResumeAnalysis);

export default function ResumePage() {
  return (
    <RequireAuth
      title="Sign in to analyze resumes"
      description="The Resume Agent caches your score and deducts 10 coins per run, so it needs your account."
    >
      <ResumeTool />
    </RequireAuth>
  );
}

function ResumeTool() {
  const { user, devUserId, refreshUser } = useAuth();
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [role, setRole] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Identity normally travels in the HTTP-only session cookie. The header is
  // only used by the development fallback when Firebase is not configured.
  const authHeaders = (): AuthHeaders | undefined =>
    devUserId ? { userId: devUserId } : undefined;

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
        const cached = await api.getMyResume(auth);
        if (!cancelled) setState({ status: "done", ...cached });
      } catch {
        /* no cached resume */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, devUserId]);

  const handleAnalyze = async (payload: { text?: string; file?: File }) => {
    if (!role.trim()) {
      setState({
        status: "error",
        error: new Error("Select a target role before analyzing."),
      });
      return;
    }
    const text = payload.text?.trim() ?? "";
    if (!payload.file && text.length < 50) {
      setState({
        status: "error",
        error: new Error(
          "Upload a PDF or paste your resume before analyzing.",
        ),
      });
      return;
    }
    setState({ status: "loading", step: "queued", percent: 0 });
    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `resume-${Date.now()}`;
    try {
      const auth = authHeaders();
      const onProgress = (progress: { step: string; percent: number }) => {
        setState({ status: "loading", step: progress.step, percent: progress.percent });
      };
      const data = payload.file
        ? await api.analyzeResumePdf(
            payload.file,
            role.trim() || undefined,
            { ...auth, idempotencyKey },
            onProgress,
          )
        : await api.analyzeResume(
            {
              resume: text,
              role: role.trim() || undefined,
            },
            { ...auth, idempotencyKey },
            onProgress,
          );
      setState({ status: "done", ...data });
      if (typeof data.interviewCoins === "number") {
        setProfile((p) =>
          p
            ? { ...p, interviewCoins: data.interviewCoins ?? p.interviewCoins }
            : p,
        );
      } else {
        const me = await api.getMe(auth);
        setProfile(me);
      }
      // Keep the navbar coin badge in step with the charge.
      void refreshUser().catch(() => {});
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
    <section className="max-w-6xl mx-auto px-6 pt-10 pb-20">
      <div className="animate-fade-in-up relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/20 via-violet-600/8 to-cyan-500/10 p-6 sm:p-9">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl"
          aria-hidden="true"
        />
        <span className="chip glass text-white/70">Resume Agent</span>
        <h1 className="mt-4 max-w-3xl text-4xl sm:text-5xl font-semibold tracking-tight">
          Make your resume{" "}
          <span className="text-gradient">impossible to ignore</span>
        </h1>
        <p className="mt-4 max-w-2xl text-white/65 leading-relaxed">
          Upload a PDF or paste text. Get an ATS score, an honest roast, and a
          rewrite you can paste into your next application.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            "ATS score /100",
            "Honest roast",
            "Optimized rewrite",
            "Role-fit gaps",
          ].map((label) => (
            <span
              key={label}
              className="chip border border-white/10 bg-white/5 text-white/70"
            >
              {label}
            </span>
          ))}
        </div>
        {profile && (
          <p className="mt-5 text-sm text-indigo-100/85">
            Balance: <strong>{profile.interviewCoins}</strong> coins · this
            run costs {profile.resumeCoinCost ?? 10} · failed runs are free
          </p>
        )}
      </div>

      {profile && profile.interviewCoins < (profile.resumeCoinCost ?? 10) && (
        <div className="mt-6">
          <CoinsEmptyCard cost={profile.resumeCoinCost ?? 10} />
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-b from-indigo-500/[0.08] to-transparent p-6 space-y-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400" />
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200/80">
            Step 1 · Target role
          </p>
          <RoleInput value={role} onChange={setRole} disabled={isLoading} />

          <div className="h-px bg-white/8" />

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200/80 mb-3">
              Step 2 · Your resume
            </p>
            <UploadBox
              onAnalyze={handleAnalyze}
              isAnalyzing={isLoading}
              hasRole={role.trim().length > 0}
            />
          </div>
        </div>

        <div id="results" className="space-y-4">
          {state.status === "idle" && <EmptyState />}
          {state.status === "loading" && (
            <LoadingState step={state.step} percent={state.percent} />
          )}
          {state.status === "error" &&
            !(
              isCoinsError(state.error) &&
              profile &&
              profile.interviewCoins < (profile.resumeCoinCost ?? 10)
            ) && (
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

      {(data.fullName || data.suggestedJobRole) && (
        <ResultCard
          title="Extracted profile"
          content={[
            data.fullName && `Name: ${data.fullName}`,
            data.email && `Email: ${data.email}`,
            data.phone && `Phone: ${data.phone}`,
            data.suggestedJobRole && `Suggested role: ${data.suggestedJobRole}`,
            data.summary,
          ]
            .filter(Boolean)
            .join("\n")}
          tone="default"
        />
      )}

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
        title="Weaknesses"
        tone="danger"
        items={data.weaknesses ?? []}
        emptyHint="No major weaknesses called out."
        icon={
          <path d="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        }
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
        title="Recommendations"
        tone="info"
        items={data.recommendations ?? []}
        emptyHint="No extra recommendations."
        icon={<path d="M12 6v12 M6 12h12" />}
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
        title="Skills"
        tone="info"
        items={data.skills ?? []}
        variant="pills"
        emptyHint="No skills extracted."
        icon={<path d="M12 6v12 M6 12h12" />}
      />

      <BulletCard
        title="Experience"
        tone="info"
        items={data.experience ?? []}
        emptyHint="No experience extracted."
        icon={<path d="M12 6v12 M6 12h12" />}
      />

      <BulletCard
        title="Education"
        tone="info"
        items={data.education ?? []}
        emptyHint="No education extracted."
        icon={<path d="M12 6v12 M6 12h12" />}
      />

      <BulletCard
        title="Projects"
        tone="info"
        items={data.projects ?? []}
        emptyHint="No projects extracted."
        icon={<path d="M12 6v12 M6 12h12" />}
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
  const steps = [
    { n: "1", title: "Pick a role", body: "Chips or type the job you want." },
    { n: "2", title: "Add your resume", body: "PDF drop or paste text." },
    { n: "3", title: "Get the score", body: "ATS, roast, and a rewrite." },
  ];
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
        Results
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight">
        Your coaching panel
      </h3>
      <p className="mt-2 text-sm text-white/50">
        Analyze once and we cache the result so you can come back to it.
      </p>
      <ol className="mt-8 space-y-4">
        {steps.map((step) => (
          <li key={step.n} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 text-sm font-semibold text-indigo-100">
              {step.n}
            </span>
            <div>
              <p className="text-sm font-medium text-white/85">{step.title}</p>
              <p className="text-sm text-white/45">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const LOADING_MESSAGES: Record<string, string> = {
  queued: "Queued — waiting for a worker...",
  running: "Analyzing your resume...",
  extracting: "Extracting resume information...",
  scoring: "Evaluating ATS compatibility...",
  completed: "Finishing up...",
};

function LoadingState({
  step,
  percent,
}: {
  step?: string;
  percent?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % 4);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  const fallback = [
    "Analyzing your resume...",
    "Extracting resume information...",
    "Evaluating ATS compatibility...",
    "Generating recommendations...",
  ][index];
  const message =
    (step && LOADING_MESSAGES[step]) || fallback;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-indigo-400/25 bg-indigo-500/[0.08] p-6">
        <p className="text-sm font-medium text-indigo-100 animate-pulse">
          {message}
        </p>
        <p className="mt-2 text-xs text-white/45">
          {typeof percent === "number" && percent > 0
            ? `${percent}% · Failed runs are not charged.`
            : "Usually a few seconds. Failed runs are not charged."}
        </p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(12, percent ?? 18))}%`,
            }}
          />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card">
          <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
          <div className="mt-5 space-y-2">
            <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
            <div className="h-3 w-11/12 rounded bg-white/5 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
