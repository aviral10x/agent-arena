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
        className="sticky top-0 z-40 bg-[#0c0e16]/80 backdrop-blur-xl shadow-[0_0_15px_rgba(143,245,255,0.1)]"
        style={{
          borderBottom: '1px solid rgba(143, 245, 255, 0.08)',
        }}
      >
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4 sm:h-14 sm:gap-4 sm:px-6">

          {/* Logo — ARENA_OS italic font-black */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-2 sm:gap-2.5 sm:mr-4">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8"
              style={{
                border: '1px solid rgba(143,245,255,0.25)',
                background: 'rgba(143,245,255,0.10)',
              }}
            >
              <svg viewBox="0 0 40 40" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" style={{ color: 'var(--neon-cyan)' }}>
                <path d="M10 28L20 10L30 28H10Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/>
                <circle cx="20" cy="23" r="3" fill="currentColor"/>
              </svg>
            </div>
            <span className="hidden xs:block text-2xl font-black italic tracking-tighter" style={{ color: 'var(--neon-cyan)', fontFamily: 'var(--font-body)' }}>
              ARENA_OS
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
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-sm transition-all uppercase tracking-widest",
                    isBuild
                      ? "bg-[#8ff5ff] text-[#005d63] px-4 py-1.5 font-bold uppercase tracking-widest text-xs hover:skew-x-[-6deg] hover:bg-[#8ff5ff]/10 hover:text-[#8ff5ff]"
                      : on
                        ? "text-[#8ff5ff] border-b-2 border-[#8ff5ff] pb-1 shadow-[0_4px_10px_-2px_rgba(143,245,255,0.5)]"
                        : "text-[#464752] hover:text-[#8ff5ff]/70 hover:skew-x-[-6deg] hover:bg-[#8ff5ff]/10"
                  )}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: isBuild ? 700 : 600,
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
              style={{ border: '1px solid rgba(143,245,255,0.2)', color: 'var(--white-crisp)' }}
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
              borderColor: 'rgba(143,245,255,0.08)',
              background: 'rgba(12, 14, 22, 0.98)',
            }}
          >
            <nav className="flex flex-col gap-0.5">
              {[...NAV, { href: "/signals", label: "Signals", icon: "📡" }].map(item => {
                const on = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all uppercase tracking-widest"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      ...(on ? {
                        background: 'rgba(143,245,255,0.08)',
                        color: '#8ff5ff',
                        borderLeft: '2px solid #8ff5ff',
                      } : {
                        color: '#464752',
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
              className="flex flex-1 flex-col items-center gap-0.5 py-1 transition-all"
            >
              <span className="text-base leading-none sm:text-lg">{item.icon}</span>
              <span
                className="text-[9px] font-semibold transition-colors sm:text-[10px] uppercase tracking-widest"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: on ? '#8ff5ff' : '#464752',
                }}
              >
                {item.label}
              </span>
              {on && (
                <div
                  className="mt-0.5 h-0.5 w-3.5 rounded-full sm:w-4"
                  style={{
                    background: '#8ff5ff',
                    boxShadow: '0 0 6px #8ff5ff',
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
