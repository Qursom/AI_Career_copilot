import Link from "next/link";

const FEATURES = [
  {
    title: "AI Roast",
    desc: "Brutally honest, deeply specific feedback on every bullet — tone, impact, fluff, and gaps.",
    icon: (
      <path d="M12 2a7 7 0 0 1 7 7c0 4-4 4-4 9H9c0-5-4-5-4-9a7 7 0 0 1 7-7Z M9 22h6" />
    ),
  },
  {
    title: "Optimized Rewrite",
    desc: "One-click rewrite that swaps weak verbs, quantifies results, and mirrors the job description.",
    icon: (
      <path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    ),
  },
  {
    title: "ATS Score",
    desc: "See exactly how recruiters' parsers read your resume. Keyword hits, structure, red flags.",
    icon: (
      <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z M9 12l2 2 4-4" />
    ),
  },
  {
    title: "Job Match",
    desc: "Paste any JD and your resume. Get a match %, missing skills, and tailored bullet suggestions.",
    icon: (
      <path d="M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01" />
    ),
  },
];

const STEPS = [
  {
    n: "01",
    title: "Paste or upload",
    desc: "Drop in your resume text or PDF. We never store it without your consent.",
  },
  {
    n: "02",
    title: "Let the copilot cook",
    desc: "An ensemble of LLMs reviews structure, impact, and ATS signals in seconds.",
  },
  {
    n: "03",
    title: "Ship a better resume",
    desc: "Copy the optimized version, keep the roast for receipts, and apply with confidence.",
  },
];

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="animate-fade-in-up">
          <span className="chip glass text-white/80">
            <span className="relative inline-flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-ring" />
              <span className="relative inline-block w-2 h-2 rounded-full bg-emerald-400" />
            </span>
            Now in public beta
          </span>

          <h1 className="mt-6 text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05] max-w-4xl">
            Land the job your
            <br />
            resume is <span className="text-gradient">holding you back from</span>.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-white/60 max-w-2xl leading-relaxed">
            An AI copilot that roasts your resume, rewrites it to hit ATS
            keywords, and scores your match against any job description — in
            seconds, not weekends.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/resume" className="btn-primary">
              Analyze my resume
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
            </Link>
            <Link href="/job-match" className="btn-ghost">
              Try job match
            </Link>
          </div>

          <div className="mt-12 flex items-center gap-6 text-xs text-white/40">
            <div className="flex -space-x-2">
              {["#6366f1", "#8b5cf6", "#3b82f6", "#22d3ee"].map((c) => (
                <span
                  key={c}
                  className="w-7 h-7 rounded-full border-2 border-[#05050a]"
                  style={{ background: c }}
                />
              ))}
            </div>
            <span>
              <span className="text-white font-medium">2,400+</span> resumes
              roasted this week
            </span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <span className="chip glass text-white/70">What it does</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
              Everything your resume needs,
              <br />
              <span className="text-white/50">none of the fluff.</span>
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="card card-hover animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center mb-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-indigo-300"
                  aria-hidden="true"
                >
                  {f.icon}
                </svg>
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-white/55 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-10">
          <span className="chip glass text-white/70">How it works</span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
            From upload to offer in three steps.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card relative overflow-hidden">
              <span className="absolute -top-4 -right-2 text-[110px] font-bold leading-none text-white/[0.03] select-none">
                {s.n}
              </span>
              <div className="relative">
                <span className="text-xs font-mono text-indigo-300">
                  {s.n}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-blue-600/20 p-10 sm:p-14 text-center">
          <div
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(600px circle at 50% 0%, rgba(139,92,246,0.35), transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-2xl mx-auto">
              Your next role is one good resume away.
            </h2>
            <p className="mt-4 text-white/60 max-w-xl mx-auto">
              Free to try. No credit card. Honest feedback by default.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/resume" className="btn-primary">
                Start with my resume
              </Link>
              <Link href="/job-match" className="btn-ghost">
                Match against a job
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
