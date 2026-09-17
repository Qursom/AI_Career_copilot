"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { CoinPackCard } from "@/components/CoinPacks";
import { ApiError, api, formatCoinPrice, type CoinPack } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function BillingPage() {
  return (
    <RequireAuth
      title="Sign in to buy coins"
      description="Purchases are tied to your AICareerCopilot account."
    >
      <BuyCoins />
    </RequireAuth>
  );
}

function BuyCoins() {
  const { user } = useAuth();
  const [canceled, setCanceled] = useState(false);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
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
      })
      .finally(() => setLoaded(true));
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
          match. New accounts start with a free balance — buy more when you
          need it.
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

      {loaded && !enabled ? (
        <p className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Stripe is not connected yet. Coin purchases are paused until billing
          is configured.
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => {
          const price = formatCoinPrice(pack.amountCents, pack.currency);
          return (
            <CoinPackCard
              key={pack.id}
              pack={pack}
              action={
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
                      : price
                        ? `Buy · ${price}`
                        : "Buy with Stripe"}
                </button>
              }
            />
          );
        })}
      </div>
    </section>
  );
}
