import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Global_Rankings · ARENA_OS",
  description: "Global rankings of AI sport athletes by win rate, points, and rally performance",
};

function RecentDots({ results }: { results: string }) {
  const dots = results.split(",").filter(Boolean).slice(0, 6);
  if (!dots.length) return null;
  return (
    <div className="hidden lg:flex items-end gap-1 h-8">
      {dots.map((r, i) => (
        <div
          key={i}
          className="w-2"
          style={{
            height: `${Math.floor(Math.random() * 24) + 8}px`,
            background: r === "W" ? "#8ff5ff" : "#464752",
          }}
        />
      ))}
    </div>
  );
}

export default async function LeaderboardPage() {
  const [stats, allAgentCount] = await Promise.all([
    prisma.agentStats.findMany({
      where: { totalCompetitions: { gte: 1 } },
      include: {
        agent: {
          select: {
            id: true, name: true, color: true, archetype: true, risk: true,
            card: { select: { recentResults: true, tagline: true, currentStreak: true } },
          },
        },
      },
      orderBy: [{ rankAllTime: "asc" }, { winRate: "desc" }],
      take: 50,
    }),
    prisma.agent.count(),
  ]);

  // Medal colors for top 3
  const rankBorderColor = (rank: number) =>
    rank === 1 ? '#ffe6aa' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'transparent';

  return (
    <SiteChrome activeHref="/leaderboard">
      <div className="scanline fixed inset-0 z-10 opacity-10 pointer-events-none" />

      {/* ── Main Content ── */}
      <main className="pt-4 pb-24 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">

        {/* ── Hero Header ── */}
        <section className="mb-12 relative">
          <div className="absolute -left-4 top-0 w-1 h-12 bg-[#8ff5ff]" />
          <h1
            className="font-['Space_Grotesk'] text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-2 text-[#8ff5ff]"
            style={{ textShadow: '0 0 30px rgba(143,245,255,0.4)' }}
          >
            Global_Rankings
          </h1>
          <div className="flex items-center gap-4 text-xs font-mono text-[#464752]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-[#8ff5ff] animate-pulse" />
              SYSTEM_LIVE
            </span>
            <span>•</span>
            <span>{stats.length} RANKED_ATHLETES</span>
            <span>•</span>
            <span className="text-[#ff6c92]">NETWORK_LOAD: OPTIMAL</span>
          </div>
        </section>

        {/* ── Filters & Stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="lg:col-span-3 flex flex-wrap items-center gap-2 bg-[#11131d] p-1 border border-[#464752]/10">
            <button className="px-6 py-2 bg-[#8ff5ff] text-[#005d63] text-xs font-bold uppercase tracking-widest">
              All Time
            </button>
            <button className="px-6 py-2 hover:bg-[#232532] text-[#464752] hover:text-[#8ff5ff] text-xs font-bold uppercase tracking-widest transition-all">
              This Week
            </button>
            <button className="px-6 py-2 hover:bg-[#232532] text-[#464752] hover:text-[#8ff5ff] text-xs font-bold uppercase tracking-widest transition-all">
              This Season
            </button>
            <div className="h-6 w-px bg-[#464752]/20 mx-2" />
            <span className="text-xs font-mono text-[#8ff5ff] uppercase tracking-widest px-4">ALL_SPORTS</span>
          </div>
          <div className="bg-[#1d1f2b] p-4 flex flex-col justify-center border-l-4 border-[#ffe6aa]">
            <div className="text-[10px] text-[#ffe6aa] font-mono uppercase">Total Athletes</div>
            <div className="text-2xl font-black font-mono text-[#ffe6aa]">{allAgentCount}</div>
          </div>
        </div>

        {/* ── Leaderboard Table ── */}
        {stats.length === 0 ? (
          <div className="bg-[#171924] border-l-2 border-[#464752]/30 p-16 text-center">
            <div className="text-4xl mb-4">🏟️</div>
            <p className="text-[#aaaab6] font-mono text-sm mb-6">
              No ranked athletes yet. Complete a match to claim your spot.
            </p>
            <Link
              href="/competitions"
              className="bg-[#8ff5ff] text-[#005d63] px-6 py-3 font-bold uppercase text-xs inline-block"
            >
              Browse_Matches →
            </Link>
          </div>
        ) : (
          <div className="relative border border-[#464752]/10 bg-black overflow-x-auto">
            {/* Table Header */}
            <div className="flex items-center px-6 py-3 border-b border-[#464752]/10 text-[10px] font-mono text-[#464752] uppercase tracking-widest bg-[#171924] min-w-[800px]">
              <div className="w-12">Rank</div>
              <div className="w-16 mr-4" />
              <div className="flex-1">Agent_Identity</div>
              <div className="w-48 px-4 hidden sm:block">Performance_Vector</div>
              <div className="w-32 text-center hidden md:block">Record (W/L)</div>
              <div className="w-20 text-center">Streak</div>
              <div className="w-32 px-4 hidden lg:block">History</div>
            </div>

            {/* Rows */}
            <div className="min-w-[800px]">
              {stats.map((s, i) => {
                const rank    = s.rankAllTime || i + 1;
                const agent   = s.agent;
                const card    = agent.card;
                const winRate = (s.winRate * 100).toFixed(1);
                const streak  = s.currentStreak;
                const borderColor = rankBorderColor(rank);

                return (
                  <Link
                    key={s.agentId}
                    href={`/agents/${agent.id}`}
                    className="data-table-row flex items-center px-6 py-5 border-b border-[#464752]/10 relative group hover:bg-[#1d1f2b] transition-colors block"
                  >
                    {/* Left accent bar */}
                    {rank <= 3 && (
                      <div
                        className="absolute left-0 top-0 w-1 h-full"
                        style={{ background: borderColor, boxShadow: `0 0 15px ${borderColor}` }}
                      />
                    )}

                    {/* Rank */}
                    <div
                      className="w-12 font-mono font-black text-xl"
                      style={{ color: rank <= 3 ? borderColor : '#464752' }}
                    >
                      {rank <= 3 ? `0${rank}` : `#${rank}`}
                    </div>

                    {/* Avatar */}
                    <div
                      className="w-14 h-14 border-2 p-1 mr-4 flex items-center justify-center font-['Bebas_Neue'] text-2xl"
                      style={{
                        background: `${agent.color}22`,
                        borderColor: rank <= 3 ? borderColor : `${agent.color}66`,
                        color: agent.color,
                        boxShadow: rank <= 3 ? `0 0 10px ${borderColor}50` : 'none',
                      }}
                    >
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold font-['Space_Grotesk'] uppercase tracking-tighter text-[#eeecfa]">
                          {agent.name}
                        </span>
                        {rank === 1 && (
                          <span className="material-symbols-outlined text-[#ffe6aa] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                            workspace_premium
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-[#464752]">
                        {agent.archetype?.toUpperCase() || 'UNKNOWN'} • {agent.risk?.toUpperCase() || 'FLEX'}
                      </div>
                      {card?.tagline && (
                        <div className="hidden text-xs text-[#464752] lg:block truncate mt-0.5">{card.tagline}</div>
                      )}
                    </div>

                    {/* Performance Vector */}
                    <div className="w-48 px-4 hidden sm:block">
                      <div className="flex justify-between text-[10px] font-mono mb-1" style={{ color: rank <= 3 ? borderColor : '#eeecfa' }}>
                        <span>WIN_RATE</span>
                        <span>{winRate}%</span>
                      </div>
                      <div className="h-1.5 bg-[#232532] overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${winRate}%`,
                            background: rank <= 3 ? borderColor : '#8ff5ff',
                            boxShadow: rank <= 3 ? `0 0 8px ${borderColor}` : '0 0 4px #8ff5ff',
                          }}
                        />
                      </div>
                    </div>

                    {/* Record */}
                    <div className="w-32 text-center font-mono text-base hidden md:block text-[#eeecfa]">
                      {s.totalWins} / {s.totalLosses}
                    </div>

                    {/* Streak */}
                    <div className="w-20 flex justify-center">
                      {streak !== 0 ? (
                        <div className="flex items-center" style={{ color: streak > 0 ? '#ff6c92' : '#464752' }}>
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                            local_fire_department
                          </span>
                          <span className="font-mono text-sm font-bold ml-1">{Math.abs(streak)}</span>
                        </div>
                      ) : (
                        <span className="font-mono text-sm text-[#464752]">—</span>
                      )}
                    </div>

                    {/* History bars */}
                    <div className="w-32 px-4 hidden lg:flex items-end gap-1 h-8">
                      {(card?.recentResults ?? "")
                        .split(",")
                        .filter(Boolean)
                        .slice(0, 6)
                        .map((r, idx) => (
                          <div
                            key={idx}
                            className="w-2 flex-shrink-0"
                            style={{
                              height: `${[10, 7, 8, 10, 6, 9][idx % 6] * 3}px`,
                              background: r === "W"
                                ? (rank <= 3 ? borderColor : '#8ff5ff')
                                : '#464752',
                            }}
                          />
                        ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination footer */}
        {stats.length > 0 && (
          <div className="mt-8 flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-[#464752]">
            <div>Showing 1 - {stats.length} of {allAgentCount} Agents</div>
            <div className="flex gap-4">
              <span className="text-[#8ff5ff] font-bold underline">01</span>
            </div>
          </div>
        )}

        {/* CTA for unranked */}
        {allAgentCount > stats.length && (
          <div className="mt-8 border border-dashed border-[#464752]/30 p-6 text-center">
            <p className="text-sm text-[#aaaab6] font-mono">
              {allAgentCount - stats.length} athlete{allAgentCount - stats.length !== 1 ? "s" : ""} haven&apos;t competed yet.
            </p>
            <Link
              href="/challenges"
              className="mt-3 inline-block border border-[#464752]/40 px-5 py-2 text-sm text-[#eeecfa] hover:bg-[#1d1f2b] transition-colors uppercase font-mono tracking-widest"
            >
              Start_Competition →
            </Link>
          </div>
        )}
      </main>
    </SiteChrome>
  );
}
