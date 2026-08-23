"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { ApiError, api, type CoinPack } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function BillingPage() {
  return (
    <RequireAuth
      title="Sign in to buy coins"
      description="Purchases are tied to your AI Career copilot account."
    >
      <BuyCoins />
    </RequireAuth>
  );
}

const PACK_ACCENT: Record<string, string> = {
  starter: "from-cyan-500/25 to-blue-500/10 border-cyan-400/25",
  plus: "from-indigo-500/30 to-violet-500/10 border-indigo-400/35",
  pro: "from-amber-500/25 to-orange-500/10 border-amber-400/25",
};

function BuyCoins() {
  const { user } = useAuth();
  const [canceled, setCanceled] = useState(false);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCanceled(params.get("canceled") === "1");
  }, []);

  useEffect(() => {
    void api
      .getCoinPacks()
      .then((res) => {
        setEnabled(res.enabled);
        setPacks(res.packs);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Could not load packs.");
      });
  }, []);

  const buy = async (packId: string) => {
    if (!enabled) return;
    setBusy(packId);
    setError(null);
    try {
      const { url } = await api.createCoinCheckout(packId);
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Checkout failed.");
      setBusy(null);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-6 pt-10 pb-20">
      <div className="animate-fade-in-up">
        <span className="chip glass text-white/70">Billing</span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
          Buy <span className="text-gradient">coins</span>
        </h1>
        <p className="mt-4 text-white/60 max-w-2xl leading-relaxed">
          Coins are charged only after a successful resume analysis or job
          match. You can use your starting balance in this MVP.
        </p>
        {user ? (
          <p className="mt-4 text-sm text-indigo-200/85">
            Current balance: <strong>{user.interviewCoins}</strong> coins
          </p>
        ) : null}
      </div>

      {canceled ? (
        <p className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Checkout was canceled. No coins were charged.
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!enabled ? (
        <p className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Stripe is not connected yet. Coin purchases are not available in this
          MVP.
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => {
          const accent = PACK_ACCENT[pack.id] ?? "from-white/10 to-transparent border-white/10";
          return (
            <div
              key={pack.id}
              className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 flex flex-col ${accent} ${
                pack.popular ? "ring-1 ring-indigo-300/40" : ""
              }`}
            >
              {pack.popular ? (
                <span className="absolute top-4 right-4 chip bg-indigo-500/25 text-indigo-100 border-indigo-300/30">
                  Popular
                </span>
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-widest text-white/55">
                {pack.name || pack.id}
              </p>
              <p className="mt-4 text-5xl font-semibold tracking-tight">
                {pack.coins}
              </p>
              <p className="mt-1 text-sm text-white/50">coins</p>
              <p className="mt-4 flex-1 text-sm text-white/65 leading-relaxed">
                {pack.description || `${pack.coins} coins for analyses and matches.`}
              </p>
              <button
                type="button"
                className="btn-primary mt-6 justify-center"
                disabled={!enabled || Boolean(busy)}
                onClick={() => void buy(pack.id)}
              >
                {!enabled
                  ? "Not available yet"
                  : busy === pack.id
                    ? "Redirecting…"
                    : "Buy with Stripe"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
