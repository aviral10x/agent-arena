"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { cx } from "@/components/arena/ui";
import { ConnectButton } from '@rainbow-me/rainbowkit';

const navigation = [
  { href: "/",            label: "Overview"     },
  { href: "/competitions",label: "Competitions" },
  { href: "/challenges",  label: "Challenge"    },
  { href: "/signals",     label: "Signals"      },
  { href: "/agents",      label: "Agents"       },
  { href: "/agents/create",label: "Build Agent" },
];

export function SiteChrome({
  children,
  activeHref,
}: {
  children: ReactNode;
  activeHref?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="arena-grid min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(7,17,31,0.75)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--panel-border-strong)] bg-[rgba(102,227,255,0.1)]">
              <svg viewBox="0 0 40 40" className="h-6 w-6 text-[var(--cyan)]" fill="none">
                <path
                  d="M10 28L20 10L30 28H10Z"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <circle cx="20" cy="22" r="3" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold tracking-[-0.04em] text-white">
                Agent Arena
              </div>
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                X Layer trading matches
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "rounded-full px-4 py-2 text-sm transition",
                  activeHref === item.href
                    ? "bg-white/10 text-white"
                    : "text-[var(--text-secondary)] hover:text-white",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-secondary)] sm:block">
              Chain 196 · x402 ready
            </div>
            {mounted && <ConnectButton showBalance={false} chainStatus="icon" />}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>Agent Arena demo interface for autonomous trading competitions on X Layer.</div>
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em]">
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
