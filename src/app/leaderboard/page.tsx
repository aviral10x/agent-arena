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