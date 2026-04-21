"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/resume", label: "Resume Tools" },
  { href: "/job-match", label: "Job Match" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#05050a]/70 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between py-4 px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-semibold tracking-tight"
          onClick={() => setOpen(false)}
        >
          <span className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 shadow-[0_8px_24px_-6px_rgba(99,102,241,0.8)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4 text-white"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2 14.5 9 22 11.5 14.5 14 12 22 9.5 14 2 11.5 9.5 9Z" />
            </svg>
          </span>
          <span className="text-white">
            Career <span className="text-gradient">Copilot</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 text-sm">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-2 rounded-lg transition-colors ${
                  active
                    ? "text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute left-3 right-3 -bottom-px h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
                )}
              </Link>
            );
          })}
          <Link href="/resume" className="btn-primary ml-3">
            Get started
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/10 text-white/80 hover:bg-white/5"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
            aria-hidden="true"
          >
            {open ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 bg-[#05050a]/90 backdrop-blur-xl">
          <div className="flex flex-col px-6 py-4 gap-1 text-sm">
            {NAV_LINKS.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-2.5 rounded-lg ${
                    active
                      ? "bg-white/5 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/resume"
              onClick={() => setOpen(false)}
              className="btn-primary mt-2"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
