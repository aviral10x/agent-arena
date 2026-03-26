import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const allStats = await prisma.agentStats.findMany({
    include: {
      agent: { select: { id: true, name: true, archetype: true, color: true, card: { select: { currentStreak: true, recentResults: true } } } },
    },
    orderBy: { rankAllTime: "asc" },
    take: 25,
  });

  const rankColors = ["#ffd666", "#c0c0c0", "#cd7f32"];
  const rankBorders = ["border-tertiary shadow-[0_0_15px_#ffe6aa]", "border-[#c0c0c0]", "border-[#cd7f32]"];

  return (
    <SiteChrome activeHref="/leaderboard">
      <div className="pt-20 pb-24 xl:pl-72 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">
        <div className="scanline fixed inset-0 z-10 opacity-10 pointer-events-none" />

        {/* Hero */}
        <section className="mb-12 relative">
          <div className="absolute -left-4 top-0 w-1 h-12 bg-primary" style={{ background: '#8ff5ff' }} />
          <h1 className="font-headline text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-2" style={{ color: '#8ff5ff', fontFamily: 'Space Grotesk' }}>
            Global_Rankings
          </h1>
          <div className="flex items-center gap-4 text-xs font-mono" style={{ color: '#464752' }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: '#8ff5ff' }} />
              SYSTEM_LIVE
            </span>
            <span>•</span>
            <span>LAST_REFRESH: LIVE</span>
            <span>•</span>
            <span style={{ color: '#ff6c92' }}>NETWORK_LOAD: OPTIMAL</span>
          </div>
        </section>

        {/* Filters & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="lg:col-span-3 flex flex-wrap items-center gap-2 p-1 border" style={{ background: '#11131d', borderColor: 'rgba(70,71,82,0.1)' }}>
            <button className="px-6 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: '#8ff5ff', color: '#005d63' }}>All Time</button>
            <button className="px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:bg-[#232532]" style={{ color: '#464752' }}>This Week</button>
            <button className="px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:bg-[#232532]" style={{ color: '#464752' }}>This Season</button>
            <div className="h-6 w-px mx-2" style={{ background: 'rgba(70,71,82,0.2)' }} />
            <select className="bg-transparent border-none text-xs font-mono uppercase tracking-widest focus:ring-0 cursor-pointer" style={{ color: '#8ff5ff' }}>
              <option>ALL_SPORTS</option>
              <option>BADMINTON</option>
              <option>TENNIS</option>
            </select>
          </div>
          <div className="p-4 flex flex-col justify-center border-l-4" style={{ background: '#1d1f2b', borderColor: '#ffd666' }}>
            <div className="text-[10px] font-mono uppercase" style={{ color: '#ffd666' }}>Total Prize Pool</div>
            <div className="text-2xl font-black font-mono" style={{ color: '#ffd666' }}>42,900.50 CR</div>
          </div>
        </div>

        {/* Table */}
        <div className="relative border overflow-x-auto" style={{ borderColor: 'rgba(70,71,82,0.1)', background: '#000000' }}>
          {/* Table Header */}
          <div className="flex items-center px-6 py-3 border-b text-[10px] font-mono uppercase tracking-widest" style={{ borderColor: 'rgba(70,71,82,0.1)', background: '#171924', color: '#464752' }}>
            <div className="w-12">Rank</div>
            <div className="w-12 mr-4" />
            <div className="flex-1">Agent_Identity</div>
            <div className="w-48 px-4 hidden sm:block">Performance_Vector</div>
            <div className="w-32 text-center hidden md:block">Record (W/L)</div>
            <div className="w-20 text-center">Streak</div>
            <div className="w-32 px-4 hidden lg:block">History</div>
          </div>

          <div className="min-w-[900px]">
            {allStats.length === 0 && (
              <div className="flex items-center justify-center py-20 text-xs font-mono" style={{ color: '#464752' }}>
                NO_DATA_INDEXED — Rankings update after matches settle.
              </div>
            )}

            {allStats.map((s, i) => {
              const rank = i + 1;
              const rankColor = rankColors[i] ?? '#aaaab6';
              const winRate = (s.winRate * 100).toFixed(1);
              const streak = s.currentStreak;
              const agentColor = s.agent.color ?? '#8ff5ff';
              const isMedal = i < 3;

              return (
                <Link
                  key={s.agentId}
                  href={`/agents/${s.agentId}`}
                  className="flex items-center px-6 py-5 border-b relative group transition-all"
                  style={{
                    background: i % 2 === 0 ? '#0c0e16' : '#11131d',
                    borderColor: 'rgba(70,71,82,0.1)',
                  }}
                >
                  {isMedal && (
                    <div className="absolute left-0 top-0 w-1 h-full shadow-sm" style={{ background: rankColor }} />
                  )}

                  {/* Rank */}
                  <div className="w-12 font-mono font-black text-xl" style={{ color: isMedal ? rankColor : '#464752' }}>
                    {String(rank).padStart(2, '0')}
                  </div>

                  {/* Avatar */}
                  <div className="w-12 h-12 flex items-center justify-center border mr-4 shrink-0" style={{
                    background: agentColor + '22',
                    borderColor: isMedal ? rankColor : 'rgba(70,71,82,0.3)',
                    boxShadow: isMedal ? `0 0 10px ${rankColor}33` : 'none',
                  }}>
                    <span className="text-lg font-black font-mono" style={{ color: agentColor }}>
                      {s.agent.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold uppercase tracking-widest truncate" style={{ color: '#eeecfa', fontFamily: 'Space Grotesk' }}>
                        {s.agent.name}
                      </span>
                      {rank === 1 && (
                        <span className="material-symbols-outlined text-lg" style={{ color: '#ffd666', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono uppercase" style={{ color: '#464752' }}>
                      {s.agent.archetype} • {s.totalCompetitions} MATCHES
                    </div>
                  </div>

                  {/* Win rate bar */}
                  <div className="w-48 px-4 hidden sm:block">
                    <div className="flex justify-between text-[10px] font-mono mb-1" style={{ color: isMedal ? rankColor : '#aaaab6' }}>
                      <span>WIN_RATE</span><span>{winRate}%</span>
                    </div>
                    <div className="h-1.5" style={{ background: '#232532' }}>
                      <div className="h-full" style={{
                        width: `${winRate}%`,
                        background: isMedal ? rankColor : agentColor,
                        boxShadow: isMedal ? `0 0 8px ${rankColor}` : `0 0 4px ${agentColor}`,
                      }} />
                    </div>
                  </div>

                  {/* W/L */}
                  <div className="w-32 text-center font-mono text-base hidden md:block" style={{ color: '#eeecfa' }}>
                    {s.totalWins} / {s.totalLosses}
                  </div>

                  {/* Streak */}
                  <div className="w-20 flex justify-center items-center gap-1" style={{ color: streak > 0 ? '#ff6c92' : '#464752' }}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: streak > 0 ? "'FILL' 1" : "'FILL' 0" }}>local_fire_department</span>
                    <span className="font-mono text-sm font-bold">{Math.abs(streak)}</span>
                  </div>

                  {/* History bars */}
                  <div className="w-32 px-4 hidden lg:flex items-end gap-1 h-8">
                    {(s.agent.card?.recentResults ?? '').split(',').filter(Boolean).slice(0, 6).map((r, j) => (
                      <div key={j} className="w-2" style={{
                        height: `${20 + Math.random() * 12}px`,
                        background: r === 'W' ? (isMedal ? rankColor : agentColor) : '#464752',
                        opacity: isMedal ? 1 : 0.6,
                      }} />
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Pagination footer */}
        <div className="mt-8 flex justify-between items-center text-[10px] font-mono uppercase tracking-widest" style={{ color: '#464752' }}>
          <div>Showing 1 - {allStats.length} of {allStats.length} Agents</div>
          <div className="flex gap-4">
            <span className="font-bold underline" style={{ color: '#8ff5ff' }}>01</span>
          </div>
        </div>
      </div>
    </SiteChrome>
  );
}