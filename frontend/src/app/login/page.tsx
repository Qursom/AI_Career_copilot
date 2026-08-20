"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useAuth } from "@/lib/auth-context";

const AFTER_AUTH = "/dashboard";

const PERKS = [
  "ATS score + roast + rewrite in one run",
  "Match any job description in seconds",
  "150 interview coins to start — failed runs are free",
  "Your resume is not used to train models",
];

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [showEmail, setShowEmail] = useState(false);

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
    <section className="max-w-5xl mx-auto px-6 pt-8 pb-20">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] items-center">
        <div className="hidden lg:block animate-fade-in-up">
          <span className="chip glass text-white/70">Welcome</span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight leading-tight">
            Sign in and ship a
            <span className="text-gradient"> stronger resume</span> today.
          </h1>
          <p className="mt-4 text-white/55 leading-relaxed">
            One workspace for roast, rewrite, ATS score, and job match. Google
            sign-in takes about ten seconds.
          </p>
          <ul className="mt-8 space-y-3">
            {PERKS.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-white/70">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    className="w-3 h-3"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-8 sm:p-10 text-center animate-fade-in-up">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 shadow-[0_8px_24px_-6px_rgba(99,102,241,0.8)] ring-1 ring-white/20">
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
            Career <span className="text-gradient">Copilot</span>
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight">
            Welcome back
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Analyze your resume. Match jobs. Build your career with AI.
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

          <p className="mt-4 text-xs text-white/40">Secure authentication · Google OAuth</p>

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
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 outline-none focus:border-indigo-400/40"
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
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 outline-none focus:border-indigo-400/40"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={auth.isSigningIn}
                    className="btn-primary w-full justify-center disabled:opacity-60"
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
      </div>
    </section>
  );
}
