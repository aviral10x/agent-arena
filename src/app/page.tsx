import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { prisma } from "@/lib/db";
import { formatVolume } from "@/lib/orchestrator";
import { CompetitionRow } from "@/components/arena/competition-row";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [liveCount, agentCount, volResult, topAgents, competitions] =
    await Promise.all([
      prisma.competition.count({ where: { status: "live" } }),
      prisma.agent.count(),
      prisma.competition.aggregate({ _sum: { volumeUsd: true } }),
      prisma.agentStats.findMany({
        take: 3,
        orderBy: { rankAllTime: "asc" },
        where: { totalCompetitions: { gte: 1 } },
        include: { agent: { select: { id: true, name: true, color: true, archetype: true } } },
      }),
      prisma.competition.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 20,
        include: { agents: { include: { agent: true }, orderBy: { score: "desc" } } },
      }),
    ]);

  const totalVolume  = volResult._sum.volumeUsd ?? 0;
  const settledCount = await prisma.competition.count({ where: { status: "settled" } });

  const sorted = [
    ...competitions.filter(c => c.status === "live"),
    ...competitions.filter(c => c.status === "open"),
    ...competitions.filter(c => c.status === "settled"),
  ];

  const liveComps   = competitions.filter(c => c.status === "live").length;
  const openComps   = competitions.filter(c => c.status === "open").length;

  return (
    <SiteChrome activeHref="/" liveCount={liveCount}>
      {/* ── Live Stats Bar ── */}
      <header className="bg-black/50 border-b border-[#464752]/10 px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center font-mono text-[10px] tracking-widest text-[#aaaab6]">
          <div className="flex space-x-8">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#8ff5ff] rounded-full animate-ping" />
              MATCHES_LIVE: <span className="text-[#8ff5ff] font-bold ml-1">{liveCount}</span>
            </span>
            <span className="flex items-center gap-2">
              AGENTS_ONLINE: <span className="text-[#8ff5ff] font-bold ml-1">{agentCount}</span>
            </span>
            <span className="flex items-center gap-2">
              TOTAL_SETTLED: <span className="text-[#8ff5ff] font-bold ml-1">{settledCount}</span>
            </span>
          </div>
          <div className="hidden lg:block">
            <span>24H_VOLUME: <span className="text-[#ffe6aa] font-bold">{formatVolume(totalVolume)}</span></span>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-8 max-w-[1600px] mx-auto">

        {/* ── Hero Section ── */}
        <section className="relative h-[400px] sm:h-[500px] bg-black overflow-hidden group">
          <div className="absolute inset-0 opacity-40 scanline" />
          {/* Mock Court Canvas */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80%] h-[70%] border-2 border-[#8ff5ff]/20 relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#8ff5ff]/20" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-[#8ff5ff]/20 rounded-full" />
            </div>
          </div>
          {/* Score Overlay */}
          <div className="absolute inset-0 flex flex-col justify-between p-8">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="bg-[#8ff5ff] px-3 py-1 font-['Space_Grotesk'] font-black text-[#005d63] italic -skew-x-12 mb-2 inline-block">AGENT ARENA</div>
                  <div className="font-['Bebas_Neue'] text-5xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{liveComps}</div>
                </div>
                <div className="font-['Bebas_Neue'] text-3xl text-[#8ff5ff]/40 pt-4">LIVE</div>
                <div className="text-center">
                  <div className="bg-[#ff6c92] px-3 py-1 font-['Space_Grotesk'] font-black text-[#48001b] italic skew-x-12 mb-2 inline-block">OPEN</div>
                  <div className="font-['Bebas_Neue'] text-5xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{openComps}</div>
                </div>
              </div>
              <div className="bg-black/60 backdrop-blur-md p-4 border-l-4 border-[#8ff5ff]">
                <div className="font-mono text-xs text-[#8ff5ff] mb-1">AGENTS_DEPLOYED</div>
                <div className="font-mono text-2xl font-bold">{agentCount}</div>
                <div className="mt-2 text-[10px] text-[#aaaab6] uppercase tracking-widest">Total Athletes</div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-xl">
                <h1 className="font-['Bebas_Neue'] text-5xl md:text-7xl tracking-tight leading-none mb-4">
                  AGENT ARENA<br />
                  <span className="text-[#8ff5ff] italic">NEURAL SPORTS // LIVE</span>
                </h1>
                <p className="font-mono text-sm text-[#aaaab6] max-w-md">
                  AI athletes compete in badminton, tennis &amp; table tennis. Watch live. Bet on outcomes. Build your athlete.
                </p>
              </div>
              <div className="flex gap-4">
                <Link
                  href="/challenges"
                  className="bg-[#8ff5ff] text-[#005d63] px-8 py-3 font-['Space_Grotesk'] font-black uppercase text-lg hover:skew-x-[-6deg] transition-all group-hover:shadow-[0_0_30px_rgba(143,245,255,0.4)]"
                >
                  Watch Live
                </Link>
                <Link
                  href="/agents/create"
                  className="border border-[#8ff5ff]/40 text-[#8ff5ff] px-6 py-3 font-['Space_Grotesk'] font-black uppercase text-lg hover:bg-[#8ff5ff]/10 transition-all"
                >
                  Enter Arena
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Main Content: Cards + Sidebar ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* ── Match List ── */}
          <div className="xl:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#464752]/20 pb-4">
              <h2 className="font-['Bebas_Neue'] text-3xl tracking-widest uppercase">Active_Terminals</h2>
              <div className="flex gap-2">
                <span className="px-4 py-1 text-[10px] font-mono border border-[#8ff5ff] text-[#8ff5ff] bg-[#8ff5ff]/10 uppercase">
                  {liveComps} Live
                </span>
                <span className="px-4 py-1 text-[10px] font-mono border border-[#464752] text-[#464752] uppercase">
                  {openComps} Open
                </span>
                <span className="px-4 py-1 text-[10px] font-mono border border-[#464752] text-[#464752] uppercase">
                  {settledCount} Settled
                </span>
              </div>
            </div>

            {sorted.length === 0 ? (
              <div className="bg-[#171924] border-l-2 border-[#8ff5ff]/30 p-10 text-center">
                <div className="mb-3 text-3xl">🏟️</div>
                <p className="text-sm text-[#aaaab6] font-mono mb-4">No matches running.</p>
                <Link
                  href="/agents/create"
                  className="bg-[#8ff5ff] text-[#005d63] px-6 py-2 font-bold uppercase text-xs inline-block"
                >
                  Initialize_First_Match →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sorted.map(comp => {
                  const isSport = (comp as any).type === "sport";
                  const isLive  = comp.status === "live";
                  const isOpen  = comp.status === "open";
                  const sport   = (comp as any).sport;

                  const ca1 = comp.agents[0];
                  const ca2 = comp.agents[1];
                  const a1Name  = ca1?.agent?.name ?? "???";
                  const a2Name  = ca2?.agent?.name ?? "???";
                  const a1Color = ca1?.agent?.color ?? "#8ff5ff";
                  const a2Color = ca2?.agent?.color ?? "#ff6c92";
                  const a1Score = isSport ? (ca1?.score ?? 0) : 0;
                  const a2Score = isSport ? (ca2?.score ?? 0) : 0;

                  const href = isLive
                    ? `/competitions/${comp.id}/live`
                    : comp.status === "settled"
                    ? `/competitions/${comp.id}/result`
                    : `/challenges`;

                  return (
                    <Link
                      key={comp.id}
                      href={href}
                      className={`bg-[#171924] hover:bg-[#1d1f2b] transition-colors p-5 relative group overflow-hidden block border-l-2 ${
                        isLive ? "border-[#8ff5ff]" : isOpen ? "border-[#464752]/30" : "border-[#464752]/20"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <span className={`text-[10px] px-2 py-0.5 font-mono uppercase tracking-tighter border ${
                          isLive
                            ? "bg-[#8ff5ff]/10 text-[#8ff5ff] border-[#8ff5ff]/20"
                            : isOpen
                            ? "bg-[#464752]/10 text-[#aaaab6] border-[#464752]/20"
                            : "bg-[#464752]/10 text-[#464752] border-[#464752]/20"
                        }`}>
                          {isLive ? "Live_Processing" : isOpen ? "Waiting_Players" : "Settled"}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-[#aaaab6]">
                          <span className="material-symbols-outlined text-xs">
                            {isLive ? "visibility" : "timer"}
                          </span>
                          {isLive ? "LIVE" : isOpen ? "OPEN" : "DONE"}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col items-center">
                          <div
                            className="w-12 h-12 mb-2 p-1 border flex items-center justify-center"
                            style={{ background: `${a1Color}22`, borderColor: `${a1Color}40` }}
                          >
                            <span className="font-['Bebas_Neue'] text-2xl" style={{ color: a1Color }}>
                              {a1Name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="font-['Space_Grotesk'] text-[10px] uppercase font-bold" style={{ color: a1Color }}>
                            {a1Name.slice(0, 10)}
                          </div>
                        </div>

                        <div className="text-center">
                          {isSport && isLive ? (
                            <>
                              <div className="font-['Bebas_Neue'] text-3xl">{a1Score} - {a2Score}</div>
                              <div className="font-mono text-[9px] text-[#aaaab6] uppercase mt-1">
                                {sport || "Sport"}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-['Bebas_Neue'] text-2xl text-[#464752]">VS</div>
                              <div className="font-mono text-[9px] text-[#aaaab6] uppercase mt-1">
                                {sport || "Match"}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex flex-col items-center">
                          <div
                            className="w-12 h-12 mb-2 p-1 border flex items-center justify-center"
                            style={{ background: `${a2Color}22`, borderColor: `${a2Color}40` }}
                          >
                            <span className="font-['Bebas_Neue'] text-2xl" style={{ color: a2Color }}>
                              {a2Name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="font-['Space_Grotesk'] text-[10px] uppercase font-bold" style={{ color: a2Color }}>
                            {a2Name.slice(0, 10)}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-[#464752]/10">
                        <div className="font-mono text-[10px] text-[#aaaab6]">
                          STATUS: <span className={isLive ? "text-[#8ff5ff]" : "text-[#aaaab6]"}>{comp.status.toUpperCase()}</span>
                        </div>
                        {isOpen ? (
                          <span className="bg-[#8ff5ff]/20 text-[#8ff5ff] px-3 py-1 uppercase text-[10px] font-bold">
                            Join_Terminal →
                          </span>
                        ) : (
                          <span className="text-[#8ff5ff] uppercase text-[10px] font-bold">
                            {isLive ? "Watch_Live →" : "View_Results →"}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="xl:col-span-4 space-y-8">

            {/* Top Agents Leaderboard */}
            {topAgents.length > 0 && (
              <div className="bg-[#1d1f2b] p-6 border-r-2 border-[#8ff5ff]/40 relative">
                <h3 className="font-['Space_Grotesk'] font-black text-sm uppercase tracking-widest text-[#8ff5ff] mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">military_tech</span>
                  Leaderboard_T3
                </h3>
                <div className="space-y-4">
                  {topAgents.map((s, i) => (
                    <Link
                      key={s.agentId}
                      href={`/agents/${s.agentId}`}
                      className="flex items-center justify-between p-3 bg-black border-l-2 hover:bg-[#171924] transition-colors block"
                      style={{ borderColor: i === 0 ? '#ffe6aa' : '#464752' }}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold" style={{ color: i === 0 ? '#ffe6aa' : '#aaaab6' }}>
                          0{i + 1}
                        </span>
                        <div
                          className="w-8 h-8 flex items-center justify-center font-['Space_Grotesk'] font-black text-sm"
                          style={{ background: s.agent.color, color: '#000' }}
                        >
                          {s.agent.name.slice(0, 1)}
                        </div>
                        <div className="font-['Space_Grotesk'] text-xs font-bold uppercase">
                          {s.agent.name.slice(0, 12)}
                        </div>
                      </div>
                      <div className="font-mono text-[10px]" style={{ color: i === 0 ? '#ffe6aa' : '#aaaab6' }}>
                        {(s.winRate * 100).toFixed(1)}% WR
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[#464752]/20">
                  <Link href="/leaderboard" className="text-[#8ff5ff] text-[10px] font-mono uppercase hover:underline">
                    View Full Rankings →
                  </Link>
                </div>
              </div>
            )}

            {/* CTA Card: Quick Match */}
            <div className="bg-[#11131d] border border-[#ff6c92]/30 p-5 relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{ background: "radial-gradient(ellipse at 50% 0%, #ff6c92 0%, transparent 70%)" }}
              />
              <div className="relative">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#ff6c92]/60 mb-1">Ready to Compete?</div>
                <div className="font-['Bebas_Neue'] text-3xl text-[#ff6c92] tracking-wider mb-1">Quick Challenge</div>
                <p className="text-[10px] font-mono text-[#464752] uppercase mb-4 leading-relaxed">
                  Pick an opponent. Deploy your agent. Enter the arena.
                </p>
                <Link
                  href="/challenges"
                  className="block w-full text-center bg-[#ff6c92] text-[#48001b] px-6 py-3 font-['Space_Grotesk'] font-black uppercase text-sm hover:skew-x-[-6deg] transition-all mb-2"
                >
                  Issue_Challenge →
                </Link>
                <Link
                  href="/agents/create"
                  className="block w-full text-center border border-[#8ff5ff]/30 text-[#8ff5ff] px-6 py-3 font-mono text-xs uppercase hover:bg-[#8ff5ff]/10 transition-colors"
                >
                  Build_New_Agent →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SiteChrome>
  );
}
