"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useAuth } from "@/lib/auth-context";

const AFTER_AUTH = "/dashboard";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [showEmail, setShowEmail] = useState(false);

  // Already signed in (e.g. opened /login directly on a live session).
  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      router.replace(AFTER_AUTH);
    }
  }, [auth.isLoading, auth.isAuthenticated, router]);

  const onGoogle = () => {
    void auth
      .loginWithGoogle()
      .then(() => router.push(AFTER_AUTH))
      .catch(() => {
        // Message is surfaced through auth.error.
      });
  };

  const onSubmitEmail = (e: FormEvent) => {
    e.preventDefault();
    const run =
      mode === "signin"
        ? auth.signInEmail(email, password)
        : auth.registerEmail(email, password);
    void run.then(() => router.push(AFTER_AUTH)).catch(() => {});
  };

  if (auth.isLoading || auth.isAuthenticated) {
    return (
      <p className="px-6 pt-16 text-center text-sm text-white/50" role="status">
        Loading…
      </p>
    );
  }

  return (
    <section className="max-w-md mx-auto px-6 pt-10 pb-20">
      <div className="card p-8 text-center animate-fade-in-up">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 shadow-[0_8px_24px_-6px_rgba(99,102,241,0.8)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5 text-white"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2 14.5 9 22 11.5 14.5 14 12 22 9.5 14 2 11.5 9.5 9Z" />
          </svg>
        </span>
        <p className="mt-4 text-sm font-semibold tracking-tight text-white/80">
          Career<span className="text-gradient">CopilotAI</span>
        </p>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Welcome back 👋
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Analyze your resume. Match jobs.
          <br />
          Build your career with AI.
        </p>

        {auth.sessionExpired && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
          >
            Your session has expired. Please sign in again.
          </p>
        )}
        {auth.error && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-left text-sm text-rose-200"
          >
            {auth.error}
          </p>
        )}

        <div className="mt-7">
          {auth.firebaseEnabled ? (
            <GoogleSignInButton onClick={onGoogle} loading={auth.isSigningIn} />
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/70">
              Firebase environment variables are not set, so Google sign-in is
              unavailable. Add the <code>NEXT_PUBLIC_FIREBASE_*</code> values to{" "}
              <code>frontend/.env.local</code>.
            </p>
          )}
        </div>

        <p className="mt-4 text-xs text-white/40">Secure authentication</p>

        <p className="mt-6 text-[11px] leading-relaxed text-white/35">
          By continuing you agree to our Terms of Service and Privacy Policy. We
          only read your name, email, and profile photo from Google.
        </p>

        {auth.firebaseEnabled && (
          <div className="mt-7 border-t border-white/5 pt-6">
            <button
              type="button"
              className="text-xs text-white/50 hover:text-white/80"
              onClick={() => setShowEmail((v) => !v)}
            >
              {showEmail ? "Hide email sign-in" : "Or use email instead"}
            </button>

            {showEmail && (
              <form
                onSubmit={onSubmitEmail}
                className="mt-5 space-y-4 text-left"
              >
                <label className="block text-sm">
                  <span className="text-white/60">Email</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-white/60">Password</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  disabled={auth.isSigningIn}
                  className="w-full rounded-xl border border-white/10 py-2 text-sm hover:bg-white/5 disabled:opacity-60"
                >
                  {auth.isSigningIn
                    ? "Signing you in…"
                    : mode === "signin"
                      ? "Sign in with email"
                      : "Create account"}
                </button>
                <button
                  type="button"
                  className="w-full text-xs text-white/50 hover:text-white/80"
                  onClick={() =>
                    setMode((m) => (m === "signin" ? "register" : "signin"))
                  }
                >
                  {mode === "signin"
                    ? "Need an account? Register"
                    : "Have an account? Sign in"}
                </button>
              </form>
            )}
          </div>
        )}

        {!auth.firebaseEnabled && auth.devLoginAllowed && (
          <button
            type="button"
            className="btn-primary mt-6 w-full justify-center"
            onClick={() => {
              auth.signInDev();
              router.push(AFTER_AUTH);
            }}
          >
            Continue as local user
          </button>
        )}
      </div>
    </section>
  );
}
