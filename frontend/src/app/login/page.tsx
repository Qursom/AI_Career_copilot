"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { firebaseAuthMessage } from "@/lib/firebase";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const afterAuth = () => router.push("/resume");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await auth.signInEmail(email, password);
      } else {
        await auth.registerEmail(email, password);
      }
      afterAuth();
    } catch (err) {
      setError(firebaseAuthMessage(err, "email"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-md mx-auto px-6 pt-10 pb-20">
      <h1 className="text-3xl font-semibold tracking-tight">
        Sign in to <span className="text-gradient">Career Copilot</span>
      </h1>
      <p className="mt-3 text-white/60 text-sm">
        Resume scoring uses your account so we can cache results and deduct
        interview coins.
      </p>

      {auth.firebaseEnabled ? (
        <form onSubmit={onSubmit} className="mt-8 card p-6 space-y-4">
          <label className="block text-sm">
            <span className="text-white/60">Email</span>
            <input
              type="email"
              required
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
            />
          </label>
          {error && (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="btn-primary w-full"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void auth
                .signInGoogle()
                .then(afterAuth)
                .catch((err) => setError(firebaseAuthMessage(err, "google")))
                .finally(() => setBusy(false));
            }}
          >
            Continue with Google
          </button>
          <div className="text-center text-xs text-white/40">or use email</div>
          <button type="submit" className="w-full rounded-xl border border-white/10 py-2 text-sm hover:bg-white/5" disabled={busy}>
            {mode === "signin" ? "Sign in with email" : "Create account"}
          </button>
          <button
            type="button"
            className="text-xs text-white/50"
            onClick={() =>
              setMode((m) => (m === "signin" ? "register" : "signin"))
            }
          >
            {mode === "signin"
              ? "Need an account? Register"
              : "Have an account? Sign in"}
          </button>
        </form>
      ) : (
        <div className="mt-8 card p-6 space-y-4">
          <p className="text-sm text-white/70">
            Firebase env vars are not set. Use local development login (sends{" "}
            <code>x-user-id</code> to the API).
          </p>
          {error && (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => {
              auth.signInDev();
              afterAuth();
            }}
          >
            Continue as local user
          </button>
        </div>
      )}
    </section>
  );
}
