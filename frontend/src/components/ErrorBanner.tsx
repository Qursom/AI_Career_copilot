import Link from "next/link";
import { ApiError } from "@/lib/api";

type Props = {
  error: ApiError | Error;
  onDismiss?: () => void;
};

export function isCoinsError(error: ApiError | Error): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "INSUFFICIENT_COINS" || error.status === 402)
  );
}

function parseCoinShortage(message: string): { cost: number; balance: number } | null {
  const match = message.match(/Need (\d+) coins;\s*balance is (\d+)/i);
  if (!match) return null;
  return { cost: Number(match[1]), balance: Number(match[2]) };
}

function describe(error: ApiError | Error): {
  title: string;
  body: string;
  bullets?: string[];
} {
  if (!(error instanceof ApiError)) {
    return { title: "Something went wrong", body: error.message };
  }

  if (error.isValidation) {
    const bullets = Array.isArray(error.details)
      ? (error.details as unknown[]).map(String)
      : undefined;
    return {
      title: "Check your input",
      body: error.message,
      bullets,
    };
  }
  if (error.isRateLimit) {
    return {
      title: "You're going a little fast",
      body: "Rate limit hit. Give it a few seconds and try again.",
    };
  }
  if (error.isUpstream) {
    if (error.code === "QUEUE_UNAVAILABLE") {
      return {
        title: "Analysis queue is down",
        body:
          error.message ||
          "Redis did not accept the job. Start Redis, or unset REDIS_URL to run analysis immediately.",
      };
    }
    return {
      title: "Resume analysis failed",
      body: error.message || "Please try again.",
    };
  }
  if (
    error.code === "EMPTY_RESUME" ||
    error.code === "PDF_EXTRACTION_FAILED" ||
    error.code === "INVALID_FILE_TYPE" ||
    error.code === "FILE_TOO_LARGE" ||
    error.status === 400
  ) {
    return {
      title: "Resume analysis failed",
      body: error.message || "Please try again.",
    };
  }
  if (error.status === 0) {
    return {
      title: "Can't reach the backend",
      body: "Is the NestJS API running on http://localhost:3001? Start it with `npm run start:dev` from the backend folder.",
    };
  }
  return {
    title: `Request failed (${error.status})`,
    body: error.message,
  };
}

export default function ErrorBanner({ error, onDismiss }: Props) {
  if (isCoinsError(error)) {
    return (
      <CoinsEmptyCard
        message={error.message}
        onDismiss={onDismiss}
      />
    );
  }

  const { title, body, bullets } = describe(error);
  const requestId = error instanceof ApiError ? error.requestId : null;

  return (
    <div
      role="alert"
      className="card border-red-500/30 bg-red-500/5 text-red-100"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-400/20 flex items-center justify-center text-red-300">
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
              <path d="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-red-100">{title}</h3>
            <p className="mt-1 text-sm text-red-100/80">{body}</p>
            {bullets && bullets.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm text-red-100/80">
                    <span className="mt-2 block w-1.5 h-1.5 rounded-full bg-red-300/60 flex-none" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {requestId && (
              <p className="mt-3 text-[11px] font-mono text-red-200/50">
                request id: {requestId}
              </p>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-red-200/70 hover:text-red-100"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

export function CoinsEmptyCard({
  message,
  cost = 10,
  onDismiss,
}: {
  message?: string;
  cost?: number;
  onDismiss?: () => void;
}) {
  const parsed = message ? parseCoinShortage(message) : null;
  const balance = parsed?.balance ?? 0;
  const need = parsed?.cost ?? cost;

  return (
    <div
      role="alert"
      className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent p-6"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-amber-400/10 blur-2xl"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-500/15 text-amber-100">
            <span className="text-2xl font-semibold tabular-nums leading-none">
              {balance}
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-widest text-amber-200/70">
              coins
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/80">
              Out of coins
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">
              This run needs {need} coins
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Your balance is {balance}. Analyses and job matches only charge
              after a successful run. Purchases are not available yet — Stripe
              is not connected in this MVP.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/billing" className="btn-ghost text-sm">
                View coin packs
              </Link>
            </div>
          </div>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-xs text-amber-100/60 hover:text-amber-50"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
