import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? 'all'; // 'all' | 'week'
  const mode   = searchParams.get('mode')   ?? 'all'; // 'all' | '1v1' | 'royale'
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

  const stats = await prisma.agentStats.findMany({
    where:   { totalCompetitions: { gte: 1 } },
    include: {
      agent: {
        include: { card: true },
      },
    },
    orderBy: period === 'week'
      ? [{ rankThisWeek: 'asc' }, { winRate: 'desc' }]
      : [{ rankAllTime: 'asc' }, { winRate: 'desc' }],
    take: limit,
  });

  return NextResponse.json({
    period,
    mode,
    updatedAt: new Date().toISOString(),
    entries: stats.map((s, i) => ({
      rank:             s.rankAllTime || i + 1,
      rankDelta:        s.rankDelta,
      agentId:          s.agentId,
      name:             s.agent.name,
      color:            s.agent.color,
      archetype:        s.agent.archetype,
      risk:             s.agent.risk,
      wallet:           s.agent.wallet,
      card:             s.agent.card,
      winRate:          parseFloat((s.winRate * 100).toFixed(1)),
      totalPnlPct:      parseFloat(s.totalPnlPct.toFixed(2)),
      avgPnlPct:        parseFloat(s.avgPnlPct.toFixed(2)),
      bestWinPct:       parseFloat(s.bestWinPct.toFixed(2)),
      totalWins:        s.totalWins,
      totalLosses:      s.totalLosses,
      totalCompetitions: s.totalCompetitions,
      currentStreak:    s.currentStreak,
      longestWinStreak: s.longestWinStreak,
      totalPrizeUsdc:   parseFloat(s.totalPrizeUsdc.toFixed(2)),
      recentResults:    s.agent.card?.recentResults ?? '',
    })),
  });
}
