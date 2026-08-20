"use client";

type Props = {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  className?: string;
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="w-4 h-4 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 shrink-0 animate-spin"
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
  );
}

/**
 * Google entry point used by the login screen and the navbar. Disabled while a
 * popup is open so a double click cannot open two popups or fire two logins.
 */
export default function GoogleSignInButton({
  onClick,
  loading = false,
  disabled = false,
  label = "Continue with Google",
  loadingLabel = "Signing you in…",
  className = "",
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      aria-busy={loading}
      className={`inline-flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? <Spinner /> : <GoogleMark />}
      {loading ? loadingLabel : label}
    </button>
  );
}
