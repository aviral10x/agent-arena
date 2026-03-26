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

export function SiteChrome({ children, activeHref, liveCount }: { children: ReactNode; activeHref?: string; liveCount?: number }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = activeHref ?? pathname;

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    active === href || (href !== "/" && active?.startsWith(href));

  return (
    <div className="arena-grid min-h-screen flex flex-col">

      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl"
        style={{
          background: 'rgba(5, 6, 14, 0.92)',
          borderBottom: '1px solid rgba(0, 240, 255, 0.08)',
        }}
      >
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4 sm:h-14 sm:gap-4 sm:px-6">

          {/* Logo — Task 9 */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-2 sm:gap-2.5 sm:mr-4">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8"
              style={{
                border: '1px solid rgba(0,240,255,0.25)',
                background: 'rgba(0,240,255,0.10)',
              }}
            >
              <svg viewBox="0 0 40 40" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" style={{ color: 'var(--neon-cyan)' }}>
                <path d="M10 28L20 10L30 28H10Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/>
                <circle cx="20" cy="23" r="3" fill="currentColor"/>
              </svg>
            </div>
            <span className="hidden xs:block" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.05em', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--neon-cyan)' }}>AGENT</span>
              <span style={{ color: 'var(--white-crisp)' }}>_</span>
              <span style={{ color: 'var(--neon-magenta)' }}>ARENA</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV.map(item => {
              const on = isActive(item.href);
              const isBuild = item.label === "Build";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors lg:px-3 lg:text-sm",
                    isBuild
                      ? ""
                      : on
                        ? ""
                        : "hover:bg-white/5"
                  )}
                  style={{
                    fontFamily: 'var(--font-body)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    fontWeight: 600,
                    ...(isBuild ? {
                      border: '1px solid rgba(0,240,255,0.4)',
                      borderRadius: '999px',
                      color: 'var(--neon-cyan)',
                      boxShadow: '0 0 12px rgba(0,240,255,0.15)',
                      padding: '4px 14px',
                    } : on ? {
                      color: 'var(--neon-cyan)',
                      background: 'rgba(0,240,255,0.08)',
                      borderRadius: '8px',
                      textShadow: '0 0 12px rgba(0,240,255,0.5)',
                      textDecoration: 'underline',
                      textDecorationColor: 'rgba(0,240,255,0.4)',
                      textUnderlineOffset: '4px',
                    } : {
                      color: 'var(--text-secondary)',
                    }),
                  }}
                >
                  <span className="text-xs">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Live indicator */}
            <div
              className="hidden sm:flex items-center gap-1.5 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1"
              style={{
                border: '1px solid rgba(0,255,135,0.2)',
                background: 'rgba(0,255,135,0.08)',
              }}
            >
              <div className="relative">
                <div className="live-dot" />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'var(--neon-green)',
                    animation: 'live-ping 1.5s ease-in-out infinite',
                  }}
                />
              </div>
              <span
                className="text-[9px] font-semibold uppercase tracking-widest sm:text-[10px]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-green)' }}
              >
                {liveCount !== undefined && liveCount > 0 ? `LIVE ${liveCount}` : 'Live'}
              </span>
            </div>

            <ConnectButtonSafe />

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg md:hidden"
              style={{ border: '1px solid rgba(0,240,255,0.2)', color: 'var(--white-crisp)' }}
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
          <div
            className="border-t px-4 py-2 md:hidden"
            style={{
              borderColor: 'rgba(0,240,255,0.08)',
              background: 'rgba(5, 6, 14, 0.98)',
            }}
          >
            <nav className="flex flex-col gap-0.5">
              {[...NAV, { href: "/signals", label: "Signals", icon: "📡" }].map(item => {
                const on = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                    style={{
                      fontFamily: 'var(--font-body)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      ...(on ? {
                        background: 'rgba(0,240,255,0.08)',
                        color: 'var(--neon-cyan)',
                        borderLeft: '2px solid var(--neon-cyan)',
                      } : {
                        color: 'var(--text-secondary)',
                      }),
                    }}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
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
                className="text-[9px] font-semibold transition-colors sm:text-[10px]"
                style={{
                  fontFamily: 'var(--font-body)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: on ? 'var(--neon-cyan)' : 'var(--text-muted)',
                }}
              >
                {item.label}
              </span>
              {on && (
                <div
                  className="mt-0.5 h-0.5 w-3.5 rounded-full sm:w-4"
                  style={{
                    background: 'var(--neon-cyan)',
                    boxShadow: '0 0 6px var(--neon-cyan)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
