import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { CompetitionFilters } from "@/components/arena/competition-filters";
import { prisma } from "@/lib/db";
import type { Competition } from "@/lib/arena-data";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  const comps = await prisma.competition.findMany({
    include: {
      agents: {
        include: { agent: true },
        orderBy: { score: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const competitions: Competition[] = comps.map((comp: any) => ({
    ...comp,
    mode:   comp.mode   as "1v1" | "royale",
    status: comp.status as "live" | "open" | "settled",
    volume: `$${((comp.volumeUsd ?? 0) / 1000).toFixed(1)}k`,
    agents: comp.agents.map((ca: any) => ({
      ...ca.agent,
      traits:    JSON.parse(ca.agent.traits),
      risk:      ca.agent.risk as any,
      pnl:       ca.pnl,
      pnlPct:    ca.pnlPct,
      trades:    ca.trades,
      portfolio: ca.portfolio,
      score:     ca.score,
    })),
  }));

  const liveCount   = competitions.filter((c) => c.status === "live").length;
  const openCount   = competitions.filter((c) => c.status === "open").length;
  const settledCount = competitions.filter((c) => c.status === "settled").length;

  return (
    <SiteChrome activeHref="/competitions">
      <div className="scanline fixed inset-0 z-10 opacity-10 pointer-events-none" />

      <main className="pt-4 pb-24 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">

        {/* ── Hero Header ── */}
        <section className="mb-10 relative">
          <div className="absolute -left-4 top-0 w-1 h-12 bg-[#8ff5ff]" />
          <h1
            className="font-['Space_Grotesk'] text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-2 text-[#8ff5ff]"
            style={{ textShadow: "0 0 30px rgba(143,245,255,0.4)" }}
          >
            Active_Terminals
          </h1>
          <div className="flex items-center gap-4 text-xs font-mono text-[#464752]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-[#8ff5ff] animate-pulse" />
              SYSTEM_LIVE
            </span>
            <span>•</span>
            <span>{liveCount} LIVE · {openCount} OPEN · {settledCount} SETTLED</span>
          </div>
        </section>

        {/* ── Stats + Filter Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="lg:col-span-3 flex flex-wrap items-center gap-4 bg-[#11131d] p-4 border border-[#464752]/10">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="w-1.5 h-1.5 bg-[#8ff5ff] rounded-full animate-ping" />
              <span className="text-[#8ff5ff]">LIVE: {liveCount}</span>
            </div>
            <div className="h-4 w-px bg-[#464752]/30" />
            <span className="text-xs font-mono text-[#aaaab6]">OPEN: {openCount}</span>
            <div className="h-4 w-px bg-[#464752]/30" />
            <span className="text-xs font-mono text-[#464752]">SETTLED: {settledCount}</span>
            <div className="ml-auto">
              <Link
                href="/agents/create"
                className="bg-[#8ff5ff] text-[#005d63] px-5 py-2 font-['Space_Grotesk'] font-black uppercase text-xs hover:skew-x-[-6deg] transition-all inline-block"
              >
                Build_Agent →
              </Link>
            </div>
          </div>
          <div className="bg-[#1d1f2b] p-4 flex flex-col justify-center border-l-4 border-[#ffe6aa]">
            <div className="text-[10px] text-[#ffe6aa] font-mono uppercase">Total_Terminals</div>
            <div className="text-2xl font-black font-mono text-[#ffe6aa]">{competitions.length}</div>
          </div>
        </div>

        {/* ── Competition Cards Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <CompetitionFilters competitions={competitions} />
        </div>

        {/* ── Empty State ── */}
        {competitions.length === 0 && (
          <div className="bg-[#171924] border-l-2 border-[#464752]/30 p-16 text-center mt-8">
            <div className="text-4xl mb-4">🏟️</div>
            <p className="text-[#aaaab6] font-mono text-sm mb-6">
              No terminals initialized. Deploy your first agent to start.
            </p>
            <Link
              href="/agents/create"
              className="bg-[#8ff5ff] text-[#005d63] px-6 py-3 font-bold uppercase text-xs inline-block"
            >
              Initialize_Terminal →
            </Link>
          </div>
        )}

        {/* ── How it works ── */}
        <div className="mt-16 border border-[#464752]/20 bg-[#11131d] p-8">
          <h3 className="font-['Bebas_Neue'] text-2xl text-[#8ff5ff] tracking-widest mb-6 uppercase">
            How_Terminals_Work
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: "memory",      label: "01. Build",   desc: "Create your AI agent with unique tactics and play-style." },
              { icon: "bolt",        label: "02. Deploy",  desc: "Enter an open terminal. Live match starts when both seats fill." },
              { icon: "military_tech", label: "03. Dominate", desc: "Watch your agent compete in real-time. Top performers climb the global rankings." },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="bg-[#171924] border border-[#464752]/20 p-5 hover:border-[#8ff5ff]/30 transition-colors">
                <span className="material-symbols-outlined text-[#8ff5ff] text-2xl mb-3 block">{icon}</span>
                <div className="font-['Space_Grotesk'] font-black text-xs text-[#8ff5ff] uppercase tracking-widest mb-2">{label}</div>
                <p className="text-xs font-mono text-[#aaaab6] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </SiteChrome>
  );
}
