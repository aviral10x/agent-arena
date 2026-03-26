import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-[9px] font-mono uppercase tracking-widest text-[#464752]">{label}</span>
      <div className="flex-1 overflow-hidden" style={{ height: "3px", background: "rgba(70,71,82,0.3)" }}>
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-4 text-[9px] text-right font-mono text-[#464752]">{value.toFixed(0)}</span>
    </div>
  );
}

export default async function AgentsPage() {
  const agentRecords = await prisma.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      competitions: {
        include: { competition: true },
        orderBy: { competition: { createdAt: "desc" } },
        take: 5,
      },
      stats: true,
      card: true,
    },
  });

  const agents = agentRecords.map((a: any) => {
    const settled = a.competitions.filter((ca: any) => ca.competition.status === "settled");
    const wins = settled.filter((ca: any) => ca.competition.winnerId === a.id).length;
    const winRate = settled.length > 0 ? `${Math.round((wins / settled.length) * 100)}%` : "—";
    const latestComp = a.competitions[0] ?? null;
    return {
      ...a,
      traits: (() => { try { return JSON.parse(a.traits); } catch { return []; } })(),
      specialMoves: (() => { try { return JSON.parse(a.specialMoves ?? "[]"); } catch { return []; } })(),
      latestCompetition: latestComp,
      rallyWinRate: winRate,
      totalMatches: settled.length,
      wins,
    };
  });

  return (
    <SiteChrome activeHref="/agents">
      <div className="scanline fixed inset-0 z-10 opacity-10 pointer-events-none" />

      <main className="pt-4 pb-24 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">

        {/* ── Hero Header ── */}
        <section className="mb-10 relative">
          <div className="absolute -left-4 top-0 w-1 h-12 bg-[#00f0ff]" />
          <h1
            className="font-['Space_Grotesk'] text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-2 text-[#00f0ff]"
            style={{ textShadow: "0 0 30px rgba(143,245,255,0.4)" }}
          >
            Agent_Roster
          </h1>
          <div className="flex items-center gap-4 text-xs font-mono text-[#464752]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-[#00f0ff] animate-pulse" />
              SYSTEM_LIVE
            </span>
            <span>•</span>
            <span>{agents.length} AGENTS_ENROLLED</span>
          </div>
        </section>

        {/* ── Stats + CTA Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-10">
          <div className="lg:col-span-3 bg-[#11131d] p-4 border border-[#464752]/10">
            <p className="font-mono text-sm text-[#aaaab6] leading-relaxed">
              AI sport athletes competing for dominance. Each agent has a unique play style, physical profile, and combat history.
            </p>
          </div>
          <div className="flex items-center">
            <Link
              href="/agents/create"
              className="w-full bg-[#00f0ff] text-[#005d63] px-6 py-4 font-['Space_Grotesk'] font-black uppercase text-sm hover:skew-x-[-6deg] transition-all text-center block"
            >
              Build_Agent →
            </Link>
          </div>
        </div>

        {/* ── Empty state ── */}
        {agents.length === 0 && (
          <div className="bg-[#171924] border-l-2 border-[#464752]/30 p-16 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <p className="text-[#aaaab6] font-mono text-sm mb-6">No athletes yet. Be the first to build one.</p>
            <Link
              href="/agents/create"
              className="bg-[#00f0ff] text-[#005d63] px-6 py-3 font-bold uppercase text-xs inline-block"
            >
              Create_Agent →
            </Link>
          </div>
        )}

        {/* ── Agent grid ── */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent: any) => {
            const comp = agent.latestCompetition;
            const ca   = comp;
            const isSport = comp ? (comp.competition as any)?.type === "sport" : true;

            return (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="group flex flex-col bg-[#171924] border-l-[3px] p-4 hover:bg-[#1d1f2b] transition-colors block"
                style={{ borderLeftColor: agent.color }}
              >
                {/* ── Avatar + name + win rate ── */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className="h-10 w-10 shrink-0 flex items-center justify-center font-['Bebas_Neue'] text-lg"
                      style={{ background: `${agent.color}22`, border: `1px solid ${agent.color}66`, color: agent.color }}
                    >
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2
                        className="truncate font-['Space_Grotesk'] font-black text-sm uppercase"
                        style={{ color: agent.color }}
                      >
                        {agent.name}
                      </h2>
                      <p className="truncate text-[10px] font-mono uppercase tracking-widest text-[#464752]">
                        {agent.archetype}
                      </p>
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div className="shrink-0 text-right">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">W/R</div>
                    <div className="font-mono text-sm text-[#eeecfa]">
                      {agent.stats
                        ? `${(agent.stats.winRate * 100).toFixed(0)}%`
                        : agent.rallyWinRate}
                    </div>
                    {agent.totalMatches > 0 && (
                      <div className="text-[9px] font-mono text-[#464752]">
                        {agent.wins}W·{agent.totalMatches - agent.wins}L
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Bio ── */}
                <p className="text-xs font-mono leading-5 text-[#aaaab6] line-clamp-2 mb-3">
                  {agent.bio || agent.strategy}
                </p>

                {/* ── Sport stats bars ── */}
                <div className="space-y-1 mb-3">
                  <StatBar label="SPD" value={agent.speed ?? 7} color="#00f0ff" />
                  <StatBar label="PWR" value={agent.power ?? 7} color="#ffd666" />
                  <StatBar label="STA" value={agent.stamina ?? 7} color="#00ff87" />
                  <StatBar label="ACC" value={agent.accuracy ?? 7} color="#ff2d78" />
                </div>

                {/* ── Special moves ── */}
                {agent.specialMoves && agent.specialMoves.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {agent.specialMoves.slice(0, 2).map((move: string) => (
                      <span
                        key={move}
                        className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest border border-[#00f0ff]/30 bg-[#00f0ff]/08 text-[#00f0ff]"
                      >
                        {move}
                      </span>
                    ))}
                  </div>
                )}

                {/* ── Latest competition ── */}
                {comp && (
                  <div className="mt-auto flex items-center justify-between bg-[#11131d] border border-[#464752]/20 px-3 py-2">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">Last_Match</div>
                      <div className="truncate text-[11px] font-mono text-[#eeecfa]">
                        {comp.competition?.title ?? "—"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">Score</div>
                      <div className="font-mono text-[11px] text-[#00f0ff]">
                        {isSport
                          ? `${ca.score ?? 0} pts`
                          : `${(ca.pnlPct ?? ca.pnl ?? 0) >= 0 ? "+" : ""}${(ca.pnlPct ?? ca.pnl ?? 0).toFixed(1)}%`}
                      </div>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </main>
    </SiteChrome>
  );
}
