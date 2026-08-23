"use client";

import { FormEvent, useState } from "react";
import {
  PROVIDER_GOOGLE,
  PROVIDER_PASSWORD,
} from "@/lib/auth-providers";
import { useAuth } from "@/lib/auth-context";

export default function AccountAuthCard() {
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState(auth.firebaseEmail ?? auth.user?.email ?? "");
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const providers = auth.authProviders;
  const hasGoogle = providers.includes(PROVIDER_GOOGLE);
  const hasPassword = providers.includes(PROVIDER_PASSWORD);
  const accountEmail = auth.firebaseEmail ?? auth.user?.email ?? "";

  const onAddPassword = (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setDone(null);
    if (password.length < 6) {
      setLocalError("Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setLocalError("Passwords do not match.");
      return;
    }
    void auth
      .linkEmailPassword(password, email || accountEmail)
      .then(() => {
        setPassword("");
        setConfirm("");
        setDone("Password added. You can sign in with email next time. Check your inbox to verify the address.");
      })
      .catch(() => {});
  };

  const onConnectGoogle = () => {
    setLocalError(null);
    setDone(null);
    void auth
      .linkGoogle()
      .then(() => {
        setDone("Google is connected. You can sign in with Google next time.");
      })
      .catch(() => {});
  };

  const onVerifyEmail = () => {
    setLocalError(null);
    setDone(null);
    void auth
      .requestEmailVerification()
      .then(() => {
        setDone("Verification email sent. Check your inbox.");
      })
      .catch(() => {});
  };

  return (
    <div className="mt-10 card">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
        Account settings
      </h2>
      <p className="mt-2 text-sm text-white/55">
        Authentication methods for this account. Linking never creates a second
        user or changes your coins.
      </p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <Detail label="Name" value={auth.user?.name ?? ""} />
        <Detail label="Email" value={auth.user?.email ?? ""} />
        <Detail
          label="Total coins"
          value={String(auth.user?.interviewCoins ?? 0)}
        />
        <Detail
          label="Identity"
          value="Firebase UID (one application user)"
        />
      </dl>

      <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
        <h3 className="text-sm font-medium">Authentication methods</h3>

        <ProviderRow
          name="Google"
          connected={hasGoogle}
          actionLabel={hasGoogle ? undefined : "Connect Google"}
          onAction={hasGoogle ? undefined : onConnectGoogle}
          busy={auth.isLinking}
        />

        <ProviderRow
          name="Email & Password"
          connected={hasPassword}
          actionLabel={hasPassword ? undefined : "Add password"}
        />

        {!hasPassword && auth.firebaseEnabled && (
          <form onSubmit={onAddPassword} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs text-white/50">
              Add email and password to this signed-in account. The email must
              match {accountEmail || "your current login"}.
            </p>
            <input
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-indigo-400/40"
            />
            <input
              type="password"
              minLength={6}
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-indigo-400/40"
            />
            <input
              type="password"
              minLength={6}
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-indigo-400/40"
            />
            <button
              type="submit"
              disabled={auth.isLinking}
              className="btn-primary justify-center disabled:opacity-60"
            >
              {auth.isLinking ? "Saving…" : "Add password"}
            </button>
          </form>
        )}

        {hasPassword && !auth.emailVerified && (
          <button
            type="button"
            onClick={onVerifyEmail}
            className="btn-ghost justify-center text-sm"
          >
            Send email verification
          </button>
        )}
      </div>

      {(localError || auth.error || done) && (
        <p
          role={localError || auth.error ? "alert" : "status"}
          className={`mt-4 text-sm ${
            done && !localError && !auth.error
              ? "text-emerald-300"
              : "text-rose-200"
          }`}
        >
          {localError || auth.error || done}
        </p>
      )}
    </div>
  );
}

function ProviderRow({
  name,
  connected,
  actionLabel,
  onAction,
  busy,
}: {
  name: string;
  connected: boolean;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-white/45">
          {connected ? "Connected" : "Not connected"}
        </p>
      </div>
      {connected ? (
        <span className="text-xs font-medium text-emerald-300">Connected</span>
      ) : actionLabel && onAction ? (
        <button
          type="button"
          disabled={busy}
          onClick={onAction}
          className="btn-ghost justify-center text-sm disabled:opacity-60"
        >
          {busy ? "Linking…" : actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-white/40">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-white/80 break-all">{value}</dd>
    </div>
  );
}
