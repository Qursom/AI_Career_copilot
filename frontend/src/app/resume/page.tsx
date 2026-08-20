"use client";

import { useEffect, useState } from "react";
import UploadBox from "@/components/UploadBox";
import ResultCard from "@/components/ResultCard";
import BulletCard from "@/components/BulletCard";
import ErrorBanner from "@/components/ErrorBanner";
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
  | { status: "loading" }
  | { status: "error"; error: ApiError | Error }
  | ({ status: "done" } & ResumeAnalysis);

export default function ResumePage() {
  return (
    <RequireAuth
      title="Sign in to analyze resumes"
      description="The Resume Agent caches your score and deducts 10 interview coins per run, so it needs your account."
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
    setState({ status: "loading" });
    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `resume-${Date.now()}`;
    try {
      const auth = authHeaders();
      const data = payload.file
        ? await api.analyzeResumePdf(payload.file, role.trim() || undefined, {
            ...auth,
            idempotencyKey,
          })
        : await api.analyzeResume(
            {
              resume: payload.text ?? "",
              role: role.trim() || undefined,
            },
            { ...auth, idempotencyKey },
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
    <section className="max-w-5xl mx-auto px-6 pt-10 pb-20">
      <div className="animate-fade-in-up">
        <span className="chip glass text-white/70">Resume Agent</span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
          ATS score, extract, <span className="text-gradient">and coach</span>.
        </h1>
        <p className="mt-4 text-white/60 max-w-2xl">
          Upload a PDF. We parse it on the server, score it against ATS
          standards, and cache the result for instant dashboard loads.
        </p>
        {profile && (
          <p className="mt-3 text-sm text-indigo-200/80">
            Interview coins: <strong>{profile.interviewCoins}</strong> (each
            score costs {profile.resumeCoinCost})
          </p>
        )}
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
  return (
    <div className="card flex flex-col items-center justify-center text-center py-14">
      <h3 className="mt-4 font-semibold">Your results will appear here</h3>
      <p className="mt-1 text-sm text-white/50 max-w-sm">
        Upload a PDF or paste text, then analyze. Cached scores load instantly
        on return visits.
      </p>
    </div>
  );
}

const LOADING_MESSAGES = [
  "Analyzing your resume...",
  "Extracting resume information...",
  "Evaluating ATS compatibility...",
  "Generating recommendations...",
];

function LoadingState() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <p className="text-sm text-indigo-200/90 animate-pulse">
          {LOADING_MESSAGES[index]}
        </p>
        <p className="mt-2 text-xs text-white/40">
          This usually takes a few seconds. Failed runs are not charged.
        </p>
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
