"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";

const PUBLIC_LINKS = [
  { href: "/resume", label: "Resume Tools" },
  { href: "/job-match", label: "Job Match" },
  { href: "/contact", label: "Contact" },
];

const AUTHED_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/billing", label: "Coins" },
  ...PUBLIC_LINKS,
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    user,
    isAuthenticated,
    isLoading,
    isSigningIn,
    isSigningOut,
    firebaseEnabled,
    loginWithGoogle,
    logout,
  } = useAuth();

  const links = isAuthenticated ? AUTHED_LINKS : PUBLIC_LINKS;

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleSignIn = () => {
    if (!firebaseEnabled) {
      router.push("/login");
      return;
    }
    void loginWithGoogle()
      .then(() => router.push("/dashboard"))
      .catch(() => router.push("/login"));
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    setOpen(false);
    void logout().then(() => router.push("/"));
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/8 bg-[#05050a]/75 backdrop-blur-2xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between py-3.5 px-6">
        <Link
          href={isAuthenticated ? "/dashboard" : "/"}
          className="group flex items-center gap-2.5 font-semibold tracking-tight"
          onClick={() => setOpen(false)}
        >
          <span className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 shadow-[0_8px_24px_-6px_rgba(99,102,241,0.8)] ring-1 ring-white/20">
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
            AI <span className="text-gradient">Career copilot</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-3.5 py-2 rounded-lg transition-colors ${
                isActive(link.href)
                  ? "text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute left-3 right-3 -bottom-px h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
              )}
            </Link>
          ))}

          {isLoading ? (
            <span
              className="ml-3 h-9 w-28 rounded-lg bg-white/5 animate-pulse"
              aria-hidden="true"
            />
          ) : user ? (
            <div className="relative ml-3" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 py-1.5 pl-1.5 pr-3 hover:bg-white/5"
              >
                <Avatar name={user.name} photoUrl={user.photoUrl} />
                <span className="text-left leading-tight">
                  <span className="block max-w-[9rem] truncate text-white">
                    {user.name}
                  </span>
                  <span className="block text-[11px] text-indigo-200/80">
                    {user.interviewCoins} total coins
                  </span>
                </span>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0b0b14] shadow-xl"
                >
                  <div className="border-b border-white/5 px-4 py-3">
                    <p className="truncate text-sm text-white">{user.name}</p>
                    <p className="truncate text-xs text-white/45">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/resume"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    Resume Tools
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="block w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white disabled:opacity-60"
                  >
                    {isSigningOut ? "Signing out…" : "Logout"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="btn-primary ml-3 disabled:opacity-60"
            >
              {isSigningIn ? "Signing you in…" : "Sign In with Google"}
            </button>
          )}
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
            {user && (
              <div className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5">
                <Avatar name={user.name} photoUrl={user.photoUrl} />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-white">{user.name}</span>
                  <span className="block text-[11px] text-indigo-200/80">
                    {user.interviewCoins} total coins
                  </span>
                </span>
              </div>
            )}

            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-2.5 rounded-lg ${
                  isActive(link.href)
                    ? "bg-white/5 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {isLoading ? null : user ? (
              <button
                type="button"
                className="btn-primary mt-2 justify-center"
                disabled={isSigningOut}
                onClick={handleSignOut}
              >
                {isSigningOut ? "Signing out…" : "Logout"}
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary mt-2 justify-center"
                disabled={isSigningIn}
                onClick={() => {
                  setOpen(false);
                  handleSignIn();
                }}
              >
                {isSigningIn ? "Signing you in…" : "Sign In with Google"}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
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
        className="h-8 w-8 rounded-lg object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-sm font-semibold text-white">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
