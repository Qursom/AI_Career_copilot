import Link from "next/link";

const PRODUCT = [
  { href: "/resume", label: "Resume Tools" },
  { href: "/job-match", label: "Job Match" },
  { href: "/billing", label: "Coins" },
];

const COMPANY = [
  { href: "/about", label: "About" },
  { href: "/login", label: "Sign in" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-20">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
      <div className="border-t border-white/8 bg-[#05050a]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5 space-y-5">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 font-semibold"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 shadow-[0_0_24px_-4px_rgba(99,102,241,0.8)]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-white"
                    aria-hidden="true"
                  >
                    <path d="M12 2 14.5 9 22 11.5 14.5 14 12 22 9.5 14 2 11.5 9.5 9Z" />
                  </svg>
                </span>
                <span className="text-base">
                  AI <span className="text-gradient">Career copilot</span>
                </span>
              </Link>
              <p className="max-w-sm text-sm leading-relaxed text-white/50">
                Roast weak bullets, rewrite for ATS, and match any job
                description — then apply with a score you can stand behind.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="chip border border-white/10 bg-white/5 text-white/60">
                  Free to start
                </span>
                <span className="chip border border-indigo-400/20 bg-indigo-500/10 text-indigo-200/80">
                  10 coins per run
                </span>
              </div>
            </div>

            <nav className="md:col-span-3" aria-label="Product">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                Product
              </h4>
              <ul className="space-y-2.5">
                {PRODUCT.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-white/65 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="md:col-span-2" aria-label="Company">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                Company
              </h4>
              <ul className="space-y-2.5">
                {COMPANY.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-white/65 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="md:col-span-2">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                Contact
              </h4>
              <a
                href="mailto:wandertech58@gmail.com"
                className="text-sm text-white/65 transition-colors hover:text-white"
              >
                wandertech58@gmail.com
              </a>
              <p className="mt-3 text-xs leading-relaxed text-white/35">
                Feedback and bug reports welcome.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-white/40 sm:flex-row">
            <p>© {year} AI Career copilot. Built for people applying.</p>
            <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <Link href="/about" className="hover:text-white/70">
                About
              </Link>
              <span className="hidden sm:inline text-white/15">·</span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                All systems operational
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
