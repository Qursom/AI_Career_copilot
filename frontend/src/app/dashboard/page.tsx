"use client";

import Link from "next/link";
import AccountAuthCard from "@/components/AccountAuthCard";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  return (
    <RequireAuth
      title="Sign in to open your dashboard"
      description="Your total coins, resume analysis, and job matches live behind your AICareerCopilot account."
    >
      <Dashboard />
    </RequireAuth>
  );
}

function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <section className="max-w-5xl mx-auto px-6 pt-10 pb-20">
      <div className="animate-fade-in-up relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/20 via-transparent to-cyan-500/10 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={user.name} photoUrl={user.photoUrl} />
          <div className="min-w-0">
            <span className="chip glass text-white/70">Dashboard</span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              Welcome back, <span className="text-gradient">{firstName}</span>
            </h1>
            <p className="mt-2 text-sm text-white/50 break-all">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card relative overflow-hidden">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Total coins
          </p>
          <p className="mt-3 text-4xl font-semibold text-gradient">
            {user.interviewCoins}
          </p>
          <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
              style={{
                width: `${Math.min(100, (user.interviewCoins / 20) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-3 text-sm text-white/50">
            Each resume analysis costs 10 coins. Failed runs are never charged.
            Purchases are not available yet — Stripe is not connected.
          </p>
          <Link href="/billing" className="btn-ghost mt-5 justify-center">
            View coin packs
          </Link>
        </div>

        <ActionCard
          href="/resume"
          title="Analyze Resume"
          description="Upload a PDF or paste text for an ATS score, roast, and rewrite."
          cta="Analyze Resume"
        />
        <ActionCard
          href="/job-match"
          title="Match Jobs"
          description="Score your resume against any job description and close the gaps."
          cta="Match Jobs"
        />
      </div>

      <AccountAuthCard />
    </section>
  );
}

function ActionCard({
  href,
  title,
  description,
  cta,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <div className="card card-hover flex flex-col">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 flex-1 text-sm text-white/55 leading-relaxed">
        {description}
      </p>
      <Link href={href} className="btn-primary mt-5 justify-center">
        {cta}
      </Link>
    </div>
  );
}

function Avatar({ name, photoUrl }: { name: string; photoUrl: string }) {
  if (photoUrl) {
    return (
      // Firebase avatars come from arbitrary Google CDN hosts; a plain <img>
      // avoids adding every possible remote pattern to next.config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className="w-16 h-16 rounded-2xl border border-white/10 object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span className="flex w-16 h-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-xl font-semibold text-white">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
