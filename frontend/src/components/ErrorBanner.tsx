import { ApiError } from "@/lib/api";

type Props = {
  error: ApiError | Error;
  onDismiss?: () => void;
};

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
    return {
      title: "The AI provider is having a moment",
      body:
        error.message.trim() ||
        "The upstream model call failed or timed out. Please try again.",
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
