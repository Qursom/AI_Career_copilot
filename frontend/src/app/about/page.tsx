import Link from "next/link";

const VALUES = [
  {
    title: "Honest by default",
    desc: "No participation-trophy feedback. If a bullet is weak, we'll say so — and rewrite it.",
  },
  {
    title: "Fast over fancy",
    desc: "Answers in seconds, not minutes. You have jobs to apply to.",
  },
  {
    title: "Your data, your call",
    desc: "Nothing stored without consent. No training on your resume. Ever.",
  },
];

export default function AboutPage() {
  return (
    <section className="max-w-4xl mx-auto px-6 pt-10 pb-20">
      <div className="animate-fade-in-up">
        <span className="chip glass text-white/70">About</span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
          Built for people applying,
          <br />
          <span className="text-gradient">not for recruiters.</span>
        </h1>
        <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-2xl">
          Career Copilot is an AI sidekick for job seekers. It roasts the parts
          of your resume that aren&apos;t landing, rewrites them to hit ATS
          keywords, and tells you — honestly — how well you match a given job
          description.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {VALUES.map((v, i) => (
          <div
            key={v.title}
            className="card card-hover animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <h3 className="font-semibold">{v.title}</h3>
            <p className="mt-2 text-sm text-white/55 leading-relaxed">
              {v.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-16 card text-center py-10">
        <p className="text-white/60 max-w-md mx-auto">
          Have feedback, bug reports, or a story about the resume roast that
          landed you an offer?
        </p>
        <a href="mailto:hello@example.com" className="btn-primary mt-6">
          Say hi
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
        </a>
        <div className="mt-8 text-xs text-white/40">
          <Link href="/" className="hover:text-white">
            ← Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
