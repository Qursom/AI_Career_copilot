"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useAuth } from "@/lib/auth-context";

/**
 * Gate for authenticated pages.
 *
 * Renders the sign-in prompt in place rather than issuing a redirect: the
 * protected content is never mounted before the session resolves (so it cannot
 * flash), and there is no navigation to loop on.
 */
export default function RequireAuth({
  children,
  title = "Sign in to continue",
  description = "AI Career copilot keeps your analyses and coins tied to your account.",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const {
    isAuthenticated,
    isLoading,
    isSigningIn,
    sessionExpired,
    error,
    loginWithGoogle,
    firebaseEnabled,
    devLoginAllowed,
    signInDev,
  } = useAuth();

  if (isLoading) return <AuthLoading />;

  if (!isAuthenticated) {
    return (
      <section className="max-w-md mx-auto px-6 pt-16 pb-20">
        <div className="card p-8 sm:p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 ring-1 ring-white/20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-white"
              stroke="currentColor"
              strokeWidth="2.4"
              aria-hidden="true"
            >
              <path d="M12 2 14.5 9 22 11.5 14.5 14 12 22 9.5 14 2 11.5 9.5 9Z" />
            </svg>
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm text-white/60 leading-relaxed">{description}</p>

          {sessionExpired && (
            <p
              role="status"
              className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
            >
              Your session has expired. Please sign in again.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </p>
          )}

          <div className="mt-7 space-y-3">
            {firebaseEnabled ? (
              <GoogleSignInButton
                onClick={() => void loginWithGoogle().catch(() => {})}
                loading={isSigningIn}
              />
            ) : devLoginAllowed ? (
              <button
                type="button"
                className="btn-primary w-full justify-center"
                onClick={() => signInDev()}
              >
                Continue as local user
              </button>
            ) : null}
            <Link
              href="/login"
              className="block text-xs text-white/50 hover:text-white/80"
            >
              More sign-in options
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}

/** Skeleton shown while `GET /auth/me` is in flight. */
export function AuthLoading() {
  return (
    <section className="max-w-5xl mx-auto px-6 pt-16 pb-20" aria-busy="true">
      <p className="sr-only" role="status">
        Loading…
      </p>
      <div className="h-8 w-56 rounded-lg bg-white/5 animate-pulse" />
      <div className="mt-4 h-4 w-80 max-w-full rounded bg-white/5 animate-pulse" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card">
            <div className="h-4 w-24 rounded bg-white/5 animate-pulse" />
            <div className="mt-5 space-y-2">
              <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-10/12 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
