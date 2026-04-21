import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-[#05050a]/60 backdrop-blur-xl mt-24">
      <div className="max-w-6xl mx-auto px-6 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2 space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-semibold"
          >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5 text-white"
                aria-hidden="true"
              >
                <path d="M12 2 14.5 9 22 11.5 14.5 14 12 22 9.5 14 2 11.5 9.5 9Z" />
              </svg>
            </span>
            <span>
              Career <span className="text-gradient">Copilot</span>
            </span>
          </Link>
          <p className="text-sm text-white/50 max-w-sm">
            Your AI career sidekick. Roast, rewrite, score and match — in
            seconds.
          </p>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-widest text-white/40 mb-3">
            Product
          </h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <Link className="hover:text-white" href="/resume">
                Resume Tools
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/job-match">
                Job Match
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/about">
                About
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-widest text-white/40 mb-3">
            Resources
          </h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <a className="hover:text-white" href="#">
                Docs
              </a>
            </li>
            <li>
              <a className="hover:text-white" href="#">
                Changelog
              </a>
            </li>
            <li>
              <a className="hover:text-white" href="#">
                Contact
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <p>© {new Date().getFullYear()} AI Career Copilot. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </p>
        </div>
      </div>
    </footer>
  );
}
