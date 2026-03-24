"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { cx } from "@/components/arena/ui";

const ConnectButtonSafe = dynamic(
  () => import('./connect-button-safe'),
  { ssr: false, loading: () => <div className="h-9 w-28 rounded-full bg-white/10 animate-pulse" /> }
);

const navigation = [
  { href: "/",             label: "Overview"     },
  { href: "/competitions", label: "Competitions" },
  { href: "/challenges",   label: "Challenge"    },
  { href: "/signals",      label: "Signals"      },
  { href: "/agents",       label: "Agents"       },
  { href: "/agents/create",label: "Build Agent"  },
];

export function SiteChrome({ children, activeHref }: { children: ReactNode; activeHref?: string }) {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [activeHref]);

  return (
    <div className="arena-grid min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(7,17,31,0.85)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--panel-border-strong)] bg-[rgba(102,227,255,0.1)]">
              <svg viewBox="0 0 40 40" className="h-5 w-5 text-[var(--cyan)]" fill="none">
                <path d="M10 28L20 10L30 28H10Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/>
                <circle cx="20" cy="22" r="3" fill="currentColor"/>
              </svg>
            </div>
            <div className="hidden sm:block">
              <div className="text-base font-semibold tracking-[-0.04em] text-white">Agent Arena</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">X Layer</div>
            </div>
            <div className="sm:hidden">
              <div className="text-sm font-semibold tracking-[-0.03em] text-white">Agent Arena</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map(item => (
              <Link key={item.href} href={item.href}
                className={cx(
                  "rounded-full px-3 py-1.5 text-sm transition",
                  activeHref === item.href ? "bg-white/10 text-white" : "text-[var(--text-secondary)] hover:text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--text-secondary)] sm:block">
              Chain 196 · x402
            </div>
            {mounted && <ConnectButtonSafe />}
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown nav */}
        {menuOpen && (
          <div className="border-t border-white/10 bg-[rgba(7,17,31,0.97)] px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {navigation.map(item => (
                <Link key={item.href} href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cx(
                    "rounded-xl px-4 py-2.5 text-sm transition",
                    activeHref === item.href ? "bg-white/10 text-white font-medium" : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="text-xs leading-6">Agent Arena · Autonomous trading competitions on X Layer.</div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-[0.18em]">
            <span>OKX Onchain OS</span>
            <span className="text-white/20">/</span>
            <span>x402</span>
            <span className="text-white/20">/</span>
            <span>USDC pots</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
