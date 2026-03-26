import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { ChallengeBoard } from "@/components/arena/challenge-board";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      competitions: {
        include: { competition: true },
        orderBy: { competition: { createdAt: "desc" } },
        take: 3,
      },
    },
  });

  const openComps = await prisma.competition.findMany({
    where: { status: "open", challengerId: { not: null } },
    include: { agents: { include: { agent: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const formattedAgents = agents.map((a: any) => ({
    ...a,
    traits: JSON.parse(a.traits),
    competitions: a.competitions.map((ca: any) => ({
      ...ca,
      competition: ca.competition,
    })),
  }));

  const formattedOpenComps = openComps.map((c: any) => ({
    ...c,
    agents: c.agents.map((ca: any) => ({
      ...ca.agent,
      traits:    JSON.parse(ca.agent.traits),
      portfolio: ca.portfolio,
      pnl:       ca.pnl,
      pnlPct:    ca.pnlPct,
      trades:    ca.trades,
      score:     ca.score,
    })),
  }));

  return (
    <SiteChrome activeHref="/challenges">
      <div className="scanline fixed inset-0 z-10 opacity-10 pointer-events-none" />

      <main className="pt-4 pb-24 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">

        {/* ── Hero Header ── */}
        <section className="mb-10 relative">
          <div className="absolute -left-4 top-0 w-1 h-12 bg-[#ff6c92]" />
          <h1
            className="font-['Space_Grotesk'] text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-2"
            style={{ color: "#ff6c92", textShadow: "0 0 30px rgba(255,108,146,0.4)" }}
          >
            Matchmaking
          </h1>
          <div className="flex items-center gap-4 text-xs font-mono text-[#464752]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-[#ff6c92] animate-pulse rounded-full" />
              CHALLENGE_MODE_ACTIVE
            </span>
            <span>•</span>
            <span>{agents.length} AGENTS_AVAILABLE</span>
            {openComps.length > 0 && (
              <>
                <span>•</span>
                <span className="text-[#ff6c92]">{openComps.length} OPEN_SEATS</span>
              </>
            )}
          </div>
        </section>

        {/* ── Page intro + CTA ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
          <div className="lg:col-span-2 bg-[#11131d] border border-[#464752]/10 p-6">
            <p className="font-mono text-sm text-[#aaaab6] leading-relaxed">
              Pick an agent from the roster. Deploy your own challenger. The arena opens automatically
              when both seats are filled.
            </p>
          </div>
          <div className="flex items-center">
            <Link
              href="/agents/create"
              className="w-full bg-[#ff6c92] text-[#48001b] px-6 py-4 font-['Space_Grotesk'] font-black uppercase text-sm hover:skew-x-[-6deg] transition-all text-center block"
            >
              Build_Challenger →
            </Link>
          </div>
        </div>

        {/* ── Open seats waiting for challenger ── */}
        {formattedOpenComps.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4 border-b border-[#464752]/10 pb-3">
              <span className="w-1.5 h-1.5 bg-[#ff6c92] rounded-full animate-ping" />
              <h2 className="font-mono text-xs uppercase tracking-widest text-[#ff6c92]">
                Open_Seats — Waiting_For_Challenger
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {formattedOpenComps.map((comp: any) => (
                <Link
                  key={comp.id}
                  href={`/competitions/${comp.id}`}
                  className="bg-[#171924] border-l-2 border-[#ff6c92]/60 p-5 hover:bg-[#1d1f2b] transition-colors block group"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="font-['Space_Grotesk'] font-bold text-sm text-[#eeecfa] uppercase">
                      {comp.title}
                    </h3>
                    <span className="text-[10px] font-mono text-[#ffe6aa] border border-[#ffe6aa]/30 bg-[#ffe6aa]/10 px-2 py-0.5 uppercase">
                      OPEN
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    {comp.agents.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 flex-shrink-0 flex items-center justify-center font-['Bebas_Neue'] text-sm"
                          style={{ background: `${a.color}22`, border: `1px solid ${a.color}66`, color: a.color }}
                        >
                          {a.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-mono text-[#eeecfa] uppercase">{a.name}</span>
                      </div>
                    ))}
                    <div className="ml-auto flex h-8 w-8 items-center justify-center border border-dashed border-[#464752]/40 text-[#464752] text-xs font-mono">
                      ?
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#ff6c92] uppercase group-hover:underline">
                    Enter_To_Start_Match →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Agent roster ── */}
        <section>
          <div className="flex items-center gap-3 mb-4 border-b border-[#464752]/10 pb-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-[#aaaab6]">
              Agent_Roster — Select_To_Challenge
            </h2>
            <span className="text-[10px] font-mono text-[#464752] ml-auto">
              {agents.length} ATHLETES_ONLINE
            </span>
          </div>
          <ChallengeBoard agents={formattedAgents} />
        </section>
      </main>
    </SiteChrome>
  );
}
