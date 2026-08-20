"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ARROW = (
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
);

/**
 * Landing-page call to action. Signed-out visitors get Google sign-in inline
 * instead of a detour through /login; signed-in visitors go straight to work.
 */
export default function HeroAuthCta({
  secondaryHref = "/job-match",
  secondaryLabel = "Try job match",
}: {
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading,
    isSigningIn,
    firebaseEnabled,
    loginWithGoogle,
  } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="h-11 w-44 rounded-xl bg-white/5 animate-pulse"
          aria-hidden="true"
        />
        <span
          className="h-11 w-36 rounded-xl bg-white/5 animate-pulse"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/resume" className="btn-primary">
          Analyze my resume
          {ARROW}
        </Link>
        <Link href="/dashboard" className="btn-ghost">
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {firebaseEnabled ? (
        <button
          type="button"
          disabled={isSigningIn}
          onClick={() => {
            void loginWithGoogle()
              .then(() => router.push("/dashboard"))
              .catch(() => router.push("/login"));
          }}
          className="btn-primary disabled:opacity-60"
        >
          {isSigningIn ? "Signing you in…" : "Continue with Google"}
          {!isSigningIn && ARROW}
        </button>
      ) : (
        <Link href="/login" className="btn-primary">
          Get started
          {ARROW}
        </Link>
      )}
      <Link href={secondaryHref} className="btn-ghost">
        {secondaryLabel}
      </Link>
    </div>
  );
}
