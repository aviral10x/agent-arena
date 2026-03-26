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