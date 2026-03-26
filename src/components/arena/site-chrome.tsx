"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { cx } from "@/components/arena/ui";

const ConnectButtonSafe = dynamic(
  () => import('./connect-button-safe'),
  { ssr: false, loading: () => <button className="bg-[#8ff5ff] text-[#005d63] px-4 py-1.5 font-bold uppercase text-xs skew-x-[-12deg]">Connect Wallet</button> }
);

/* Nav items — mapped from Stitch HTML */
const NAV = [
  { href: "/arena",         label: "Arena",       icon: "analytics" },
  { href: "/leaderboard",   label: "Leaderboard", icon: "military_tech" },
  { href: "/agents",        label: "Agents",      icon: "settings_accessibility" },
  { href: "/tournaments",   label: "Tournaments", icon: "bolt" },
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

      {/* ── Top Navigation Bar (Stitch exact) ── */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#0c0e16]/80 backdrop-blur-xl shadow-[0_0_15px_rgba(143,245,255,0.1)]">
        {/* Logo */}
        <Link href="/" className="text-2xl font-black text-[#8ff5ff] italic tracking-tighter" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          ARENA_OS
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-0 font-['Space_Grotesk'] uppercase tracking-widest text-sm">
          {NAV.map(item => {
            const on = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "px-4 py-2 transition-all",
                  on
                    ? "text-[#8ff5ff] border-b-2 border-[#8ff5ff] pb-1 shadow-[0_4px_10px_-2px_rgba(143,245,255,0.5)]"
                    : "text-[#464752] hover:text-[#8ff5ff]/70"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center space-x-4">
          {/* Live indicator */}
          {liveCount !== undefined && liveCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-[#8ff5ff]">
              <span className="w-1.5 h-1.5 bg-[#8ff5ff] rounded-full animate-ping" />
              LIVE {liveCount}
            </div>
          )}
          <span className="material-symbols-outlined text-[#8ff5ff] p-2 hover:bg-[#8ff5ff]/10 transition-all cursor-pointer">sensors</span>
          <ConnectButtonSafe />
          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex h-8 w-8 items-center justify-center md:hidden"
            style={{ border: '1px solid rgba(143,245,255,0.2)', color: '#8ff5ff' }}
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="fixed top-16 left-0 right-0 z-40 border-t px-4 py-2 md:hidden"
          style={{ borderColor: 'rgba(143,245,255,0.08)', background: 'rgba(12, 14, 22, 0.98)' }}
        >
          <nav className="flex flex-col gap-0.5">
            {NAV.map(item => {
              const on = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium uppercase tracking-widest"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    ...(on ? {
                      background: 'rgba(143,245,255,0.08)',
                      color: '#8ff5ff',
                      borderLeft: '2px solid #8ff5ff',
                    } : {
                      color: '#464752',
                    }),
                  }}
                >
                  <span className="material-symbols-outlined text-sm">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/agents/create"
              className="flex items-center gap-3 px-4 py-3 mt-2 bg-[#8ff5ff] text-[#005d63] text-sm font-bold uppercase tracking-widest skew-x-[-12deg]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span className="material-symbols-outlined text-sm">memory</span>
              Build Agent
            </Link>
          </nav>
        </div>
      )}

      {/* ── Page content ── */}
      <main className="flex-1 pt-16 pb-20 md:pb-0">{children}</main>

      {/* ── Mobile Bottom Navigation (Stitch exact) ── */}
      <nav className="bottom-nav md:hidden" aria-label="Mobile navigation">
        {NAV.map(item => {
          const on = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex flex-col items-center justify-center flex-1 h-full px-2 transition-all",
                on ? "bg-[#8ff5ff] text-[#0c0e16] scale-110 z-10" : "text-[#464752] hover:bg-[#11131d] hover:text-[#8ff5ff]"
              )}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase">{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/agents/create"
          className={cx(
            "flex flex-col items-center justify-center flex-1 h-full px-2 transition-all",
            isActive("/agents/create") ? "bg-[#8ff5ff] text-[#0c0e16] scale-110 z-10" : "text-[#464752] hover:bg-[#11131d] hover:text-[#8ff5ff]"
          )}
        >
          <span className="material-symbols-outlined">memory</span>
          <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase">Build</span>
        </Link>
      </nav>
    </div>
  );
}
