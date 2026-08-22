"use client";

import Link from "next/link";
import { useEffect } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";

export default function BillingSuccessPage() {
  return (
    <RequireAuth
      title="Sign in to confirm your purchase"
      description="We refresh your coin balance from your session after Stripe Checkout."
    >
      <Success />
    </RequireAuth>
  );
}

function Success() {
  const { refreshUser, user } = useAuth();

  useEffect(() => {
    void refreshUser();
    const t = window.setTimeout(() => {
      void refreshUser();
    }, 2500);
    return () => window.clearTimeout(t);
  }, [refreshUser]);

  return (
    <section className="max-w-xl mx-auto px-6 pt-16 pb-20">
      <div className="rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/15 to-transparent p-8 text-center">
        <p className="chip mx-auto bg-emerald-500/20 text-emerald-100 border-emerald-400/30">
          Payment received
        </p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          Coins are on the way
        </h1>
        <p className="mt-4 text-sm text-white/65 leading-relaxed">
          Stripe confirmed checkout. Your balance is now{" "}
          <span className="text-white font-semibold">
            {user?.interviewCoins ?? "…"}
          </span>{" "}
          total coins. If the number has not moved yet, wait a few seconds —
          the webhook credits after payment.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">
            Dashboard
          </Link>
          <Link href="/billing" className="btn-ghost">
            Buy more
          </Link>
        </div>
      </div>
    </section>
  );
}
