/**
 * AgentStats + AgentCard updater
 * Called after every competition settles.
 * Updates global leaderboard rankings atomically.
 */

import { prisma } from './db';

// ── Update a single agent's stats after a competition ─────────────────────────
export async function updateAgentStats(
  agentId:    string,
  pnlPct:     number,
  won:        boolean,
  tradesPlaced: number,
  prizeUsdc:  number = 0
) {
  const existing = await prisma.agentStats.findUnique({ where: { agentId } });

  const totalWins        = (existing?.totalWins        ?? 0) + (won ? 1 : 0);
  const totalLosses      = (existing?.totalLosses      ?? 0) + (won ? 0 : 1);
  const totalCompetitions= (existing?.totalCompetitions?? 0) + 1;
  const totalTradesPlaced= (existing?.totalTradesPlaced?? 0) + tradesPlaced;
  // totalPnlPct is stored as the running SUM (not average), so just add to it
  const totalPnlSum      = (existing?.totalPnlPct ?? 0) + pnlPct;
  const avgPnlPct        = totalPnlSum / totalCompetitions;
  const bestWinPct       = Math.max(existing?.bestWinPct ?? 0, pnlPct);
  const worstLossPct     = Math.min(existing?.worstLossPct ?? 0, pnlPct);
  const winRate          = totalWins / totalCompetitions;
  const totalPrizeUsdc   = (existing?.totalPrizeUsdc ?? 0) + prizeUsdc;

  // Streak: positive = win streak, negative = loss streak
  let currentStreak = existing?.currentStreak ?? 0;
  if (won) {
    currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
  } else {
    currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
  }
  const longestWinStreak = Math.max(existing?.longestWinStreak ?? 0, Math.max(0, currentStreak));

  await prisma.agentStats.upsert({
    where:  { agentId },
    update: {
      totalPnlPct: totalPnlSum, avgPnlPct, winRate,
      totalWins, totalLosses, totalCompetitions, totalTradesPlaced,
      bestWinPct, worstLossPct, currentStreak, longestWinStreak,
      totalPrizeUsdc, updatedAt: new Date(),
    },
    create: {
      agentId, totalPnlPct: pnlPct, avgPnlPct: pnlPct, winRate,
      totalWins, totalLosses, totalCompetitions, totalTradesPlaced,
      bestWinPct, worstLossPct, currentStreak, longestWinStreak,
      totalPrizeUsdc,
    },
  });
}

// ── Update AgentCard visual identity ─────────────────────────────────────────
export async function updateAgentCard(agentId: string, won: boolean, pnlPct: number) {
  const agent    = await prisma.agent.findUnique({ where: { id: agentId } });
  const existing = await prisma.agentCard.findUnique({ where: { agentId } });

  const totalWins   = (existing?.totalWins   ?? 0) + (won ? 1 : 0);
  const totalLosses = (existing?.totalLosses ?? 0) + (won ? 0 : 1);
  const totalComp   = (existing?.totalCompetitions ?? 0) + 1;
  const totalPnlPct = (existing?.totalPnlPct ?? 0) + pnlPct;
  const bestWinPct  = Math.max(existing?.bestWinPct ?? 0, pnlPct);

  let currentStreak = existing?.currentStreak ?? 0;
  if (won) {
    currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
  } else {
    currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
  }
  const longestWinStreak = Math.max(existing?.longestWinStreak ?? 0, Math.max(0, currentStreak));

  // Rolling last-5 results
  const prev    = (existing?.recentResults ?? '').split(',').filter(Boolean);
  const updated = [...prev, won ? 'W' : 'L'].slice(-5).join(',');

  // Auto-generate tagline from archetype if empty
  const tagline = existing?.tagline || agent?.archetype || '';

  // Auto-generate bg gradient from agent color
  const base  = agent?.color ?? '#66e3ff';
  const bgGradient = `linear-gradient(135deg, ${base}22, ${base}08)`;

  await prisma.agentCard.upsert({
    where:  { agentId },
    update: {
      totalPnlPct, totalWins, totalLosses, totalCompetitions: totalComp,
      bestWinPct, currentStreak, longestWinStreak, recentResults: updated,
      tagline, bgGradient, updatedAt: new Date(),
    },
    create: {
      agentId, tagline, bgGradient, accentColor: agent?.color ?? '#66e3ff',
      totalPnlPct, totalWins, totalLosses, totalCompetitions: totalComp,
      bestWinPct, currentStreak, longestWinStreak, recentResults: updated,
    },
  });
}

// ── Recalculate global leaderboard ranks (run after every settle) ─────────────
export async function recalculateRanks() {
  const allStats = await prisma.agentStats.findMany({
    orderBy: [
      { winRate: 'desc' },
      { totalPnlPct: 'desc' },
    ],
  });

  // Rank by win rate × total competitions (min 1 competition to rank)
  const ranked = allStats
    .filter(s => s.totalCompetitions >= 1)
    .sort((a, b) => {
      // Primary: win rate. Tie-break: total PnL.
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.totalPnlPct - a.totalPnlPct;
    });

  await Promise.all(ranked.map((s, i) =>
    prisma.agentStats.update({
      where: { id: s.id },
      data:  {
        rankAllTime:  i + 1,
        rankDelta:    s.rankAllTime ? s.rankAllTime - (i + 1) : 0,
      },
    })
  ));
}

// ── Master settle hook — call this from settleCompetition() ──────────────────
export async function onCompetitionSettle(competitionId: string) {
  const competition = await prisma.competition.findUnique({
    where:   { id: competitionId },
    include: { agents: { include: { agent: true } } },
  });
  if (!competition) return;

  const winnerId = competition.winnerId;

  for (const ca of competition.agents) {
    const won = ca.agentId === winnerId;
    // Simple prize split: winner takes 80% of entry fees (mocked for now)
    // Prize from prizePool (e.g. "$10 USDC" → 10). Winner gets 90%, loser gets 0.
    const poolRaw = competition.prizePool.replace(/[^0-9.]/g, '');
    const prizeUsdc = won && poolRaw ? parseFloat(poolRaw) * 0.9 : 0;

    await Promise.all([
      updateAgentStats(ca.agentId, ca.pnlPct, won, ca.trades, prizeUsdc),
      updateAgentCard(ca.agentId, won, ca.pnlPct),
    ]);
  }

  await recalculateRanks();
  console.log(`[stats] Updated stats + ranks after competition ${competitionId}`);
}
