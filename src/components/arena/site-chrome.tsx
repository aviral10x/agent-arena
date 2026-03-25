"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { cx } from "@/components/arena/ui";

const ConnectButtonSafe = dynamic(
  () => import('./connect-button-safe'),
  { ssr: false, loading: () => <div className="h-8 w-20 rounded-full bg-white/8 animate-pulse sm:w-24" /> }
);

/* Nav items */
const NAV = [
  { href: "/arena",         label: "Arena",   icon: "⚔" },
  { href: "/tournaments",   label: "Events",  icon: "🏁" },
  { href: "/leaderboard",   label: "Ranks",   icon: "🏆" },
  { href: "/agents",        label: "Agents",  icon: "🤖" },
  { href: "/agents/create", label: "Build",   icon: "⚡" },
];

export function SiteChrome({ children, activeHref }: { children: ReactNode; activeHref?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = activeHref ?? pathname;

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    active === href || (href !== "/" && active?.startsWith(href));

  return (
    <div className="arena-grid min-h-screen flex flex-col">

      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[rgba(10,10,18,0.92)] backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4 sm:h-14 sm:gap-4 sm:px-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-2 sm:gap-2.5 sm:mr-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--teal)]/25 bg-[var(--teal)]/10 sm:h-8 sm:w-8">
              <svg viewBox="0 0 40 40" className="h-3.5 w-3.5 text-[var(--teal)] sm:h-4 sm:w-4" fill="none">
                <path d="M10 28L20 10L30 28H10Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/>
                <circle cx="20" cy="23" r="3" fill="currentColor"/>
              </svg>
            </div>
            <span className="hidden text-xs font-bold tracking-tight text-white xs:block sm:text-sm">
              Agent Arena
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors lg:px-3 lg:text-sm",
                  isActive(item.href)
                    ? "bg-[var(--teal)]/12 text-[var(--teal)]"
                    : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                )}
              >
                <span className="text-xs">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[var(--green)]/20 bg-[var(--green)]/8 px-2 py-0.5 sm:px-2.5 sm:py-1">
              <div className="live-dot" />
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--green)] sm:text-[10px]">
                Live
              </span>
            </div>

            <ConnectButtonSafe />

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white md:hidden"
              aria-label="Menu"
            >
              {menuOpen
                ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                  </svg>
                )
              }
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="border-t border-white/[0.06] bg-[rgba(10,10,18,0.98)] px-4 py-2 md:hidden">
            <nav className="flex flex-col gap-0.5">
              {[...NAV, { href: "/signals", label: "Signals", icon: "📡" }].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-[var(--teal)]/12 text-[var(--teal)]"
                      : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                  )}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ── Page content ────────────────────────────────────────────────── */}
      {/* pb-20 clears the fixed bottom nav on mobile */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* ── Mobile bottom nav (Robinhood/Hyperliquid style) ─────────────── */}
      <nav className="bottom-nav md:hidden" aria-label="Mobile navigation">
        {NAV.map(item => {
          const on = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-1 transition-colors"
            >
              <span className="text-base leading-none sm:text-lg">{item.icon}</span>
              <span
                className={cx(
                  "text-[9px] font-semibold transition-colors sm:text-[10px]",
                  on ? "text-[var(--teal)]" : "text-[var(--text-muted)]"
                )}
              >
                {item.label}
              </span>
              {on && (
                <div className="mt-0.5 h-0.5 w-3.5 rounded-full bg-[var(--teal)] sm:w-4" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
