import HeroAuthCta from "@/components/HeroAuthCta";

const FEATURES = [
  {
    title: "AI Roast",
    desc: "Brutally honest, specific feedback on every bullet — tone, impact, fluff, and gaps.",
    icon: (
      <path d="M12 2a7 7 0 0 1 7 7c0 4-4 4-4 9H9c0-5-4-5-4-9a7 7 0 0 1 7-7Z M9 22h6" />
    ),
  },
  {
    title: "Optimized Rewrite",
    desc: "Swap weak verbs, quantify results, and mirror the job description in one pass.",
    icon: (
      <path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    ),
  },
  {
    title: "ATS Score",
    desc: "See how parsers read your resume. Keyword hits, structure, and red flags — scored.",
    icon: (
      <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z M9 12l2 2 4-4" />
    ),
  },
  {
    title: "Job Match",
    desc: "Paste any JD. Get a match %, missing skills, and bullets tailored to that role.",
    icon: (
      <path d="M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01" />
    ),
  },
];

const STEPS = [
  {
    n: "01",
    title: "Paste or upload",
    desc: "Drop in resume text or a PDF. We never store it without your consent.",
  },
  {
    n: "02",
    title: "Let the copilot cook",
    desc: "Structure, impact, and ATS signals reviewed in seconds — not a weekend rewrite.",
  },
  {
    n: "03",
    title: "Ship a better resume",
    desc: "Copy the optimized version, keep the roast, and apply with a number you can defend.",
  },
];

const STATS = [
  { value: "2,400+", label: "resumes roasted this week" },
  { value: "30s", label: "typical first analysis" },
  { value: "150", label: "free interview coins to start" },
  { value: "0", label: "charge if a run fails" },
];

const LOGOS = [
  "Google",
  "Meta",
  "Stripe",
  "Notion",
  "Amazon",
  "Figma",
  "Airbnb",
  "OpenAI",
];

const QUOTES = [
  {
    quote:
      "The roast called out three bullets I had been recycling for years. The rewrite got me the callback.",
    name: "Maya K.",
    role: "Backend engineer",
  },
  {
    quote:
      "Job Match showed me I was 18 points off a staff role. I closed two gaps and the next screen felt different.",
    name: "Jordan P.",
    role: "Product designer",
  },
  {
    quote:
      "I stopped guessing at ATS. A score and a punch list in under a minute is the workflow I actually use.",
    name: "Sam R.",
    role: "Data analyst",
  },
];

const FAQS = [
  {
    q: "Is it free to try?",
    a: "Yes. New accounts start with interview coins. Each successful resume analysis costs 10 coins. Failed runs are never charged.",
  },
  {
    q: "Do you train on my resume?",
    a: "No. Your resume is used to generate your analysis. We do not train models on your documents.",
  },
  {
    q: "How is this different from ChatGPT?",
    a: "A dedicated pipeline: ATS scoring, roast, rewrite, and job-match against a JD — with your coins, history, and account in one place.",
  },
];

export default function Home() {
  return (
    <>
      <section className="relative max-w-6xl mx-auto px-6 pt-10 pb-20 lg:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-in-up">
            <span className="chip glass text-white/80">
              <span className="relative inline-flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-ring" />
                <span className="relative inline-block w-2 h-2 rounded-full bg-emerald-400" />
              </span>
              Public beta · free to start
            </span>

            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              The career copilot that
              <span className="text-gradient"> gets you past ATS</span>
              {" "}and into the interview.
            </h1>

            <p className="mt-6 text-lg text-white/60 max-w-xl leading-relaxed">
              Roast weak bullets, rewrite for the role, score ATS fit, and match
              any job description — in seconds, not a Sunday rewrite session.
            </p>

            <div className="mt-8">
              <HeroAuthCta />
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/45">
              <li className="flex items-center gap-2">
                <Check /> No credit card
              </li>
              <li className="flex items-center gap-2">
                <Check /> Google sign-in
              </li>
              <li className="flex items-center gap-2">
                <Check /> Failed runs are free
              </li>
            </ul>
          </div>

          <div
            className="relative animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            <div className="absolute -inset-8 bg-gradient-to-br from-indigo-500/25 via-violet-500/10 to-cyan-400/10 blur-3xl pointer-events-none" />
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-white/[0.015] py-8 overflow-hidden">
        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-white/35 mb-5">
          Candidates targeting teams at
        </p>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#05050a] to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#05050a] to-transparent z-10" />
          <div className="flex w-max animate-marquee gap-12 px-8">
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="text-lg sm:text-xl font-semibold tracking-tight text-white/30 whitespace-nowrap"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="card text-center py-7">
              <p className="text-3xl font-semibold text-gradient">{s.value}</p>
              <p className="mt-2 text-sm text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10 max-w-2xl">
          <span className="chip glass text-white/70">Product</span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
            Everything a serious application needs.
            <span className="text-white/45"> Nothing extra.</span>
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="card card-hover animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/25 to-violet-500/15 border border-white/10 flex items-center justify-center mb-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-indigo-200"
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

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="chip glass text-white/70">How it works</span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
            Upload to offer-ready in three steps.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card relative overflow-hidden">
              <span className="absolute -top-4 -right-2 text-[110px] font-bold leading-none text-white/[0.04] select-none">
                {s.n}
              </span>
              <div className="relative">
                <span className="text-xs font-mono text-indigo-300">{s.n}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10 max-w-2xl">
          <span className="chip glass text-white/70">Proof</span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
            Built for people who are actually applying.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {QUOTES.map((t) => (
            <blockquote key={t.name} className="card flex flex-col">
              <p className="text-sm text-white/70 leading-relaxed flex-1">
                “{t.quote}”
              </p>
              <footer className="mt-6 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold">
                  {t.name.charAt(0)}
                </span>
                <span>
                  <span className="block text-sm font-medium">{t.name}</span>
                  <span className="block text-xs text-white/45">{t.role}</span>
                </span>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid gap-4 lg:grid-cols-3">
          {FAQS.map((item) => (
            <div key={item.q} className="card">
              <h3 className="font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm text-white/55 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/25 via-violet-600/10 to-cyan-500/10 p-10 sm:p-14 text-center">
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(700px circle at 50% -10%, rgba(139,92,246,0.4), transparent 60%)",
            }}
          />
          <div className="relative">
            <p className="chip glass mx-auto text-white/70">Start free today</p>
            <h2 className="mt-5 text-3xl sm:text-5xl font-semibold tracking-tight max-w-2xl mx-auto">
              Your next role is one honest resume away.
            </h2>
            <p className="mt-4 text-white/60 max-w-xl mx-auto">
              150 interview coins on signup. No credit card. Roast, rewrite, and
              match in the same workspace.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <HeroAuthCta
                secondaryHref="/job-match"
                secondaryLabel="Match against a job"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5 text-emerald-400"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ProductPreview() {
  return (
    <div className="relative card p-0 overflow-hidden shadow-[0_30px_80px_-30px_rgba(99,102,241,0.55)] animate-float-slow">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3 bg-white/[0.03]">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-3 text-xs text-white/40 font-mono">
          resume · analysis
        </span>
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40">
              ATS score
            </p>
            <p className="mt-1 text-5xl font-semibold text-gradient">86</p>
          </div>
          <span className="chip bg-emerald-400/10 text-emerald-200 border border-emerald-400/20">
            Interview-ready
          </span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300" />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <MiniStat label="Keywords hit" value="24 / 28" />
          <MiniStat label="Weak verbs" value="3 flagged" />
        </div>
        <div className="mt-5 rounded-xl border border-white/8 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-widest text-indigo-200/80">
            Roast
          </p>
          <p className="mt-2 text-sm text-white/70 leading-relaxed">
            “Led projects” is doing no work. Name the system, the metric, and
            the before/after — or cut the line.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["TypeScript", "NestJS", "Redis", "ATS rewrite"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/60"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
