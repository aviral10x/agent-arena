/**
 * Spectator betting engine
 * - Accept x402 bets before a competition starts
 * - Calculate live odds
 * - Settle payouts after competition ends
 * - 10% platform rake, 90% to correct bettors
 */

import { prisma } from './db';
import { hasActiveGrant } from './x402-verify';

const PLATFORM_RAKE = 0.10; // 10%

// ── Place a bet ───────────────────────────────────────────────────────────────
export async function placeBet(
  competitionId:     string,
  betterWallet:      string,
  predictedWinnerId: string,
  amountUsdc:        number,
  txSignature:       string,
  betterAgentId?:    string
): Promise<{ ok: boolean; error?: string }> {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
  });
  if (!competition) return { ok: false, error: 'Competition not found' };
  if (!competition.bettingOpen) return { ok: false, error: 'Betting is closed' };
  if (competition.bettingClosedAt && new Date() > competition.bettingClosedAt) {
    // Auto-close betting window
    await prisma.competition.update({
      where: { id: competitionId }, data: { bettingOpen: false },
    });
    return { ok: false, error: 'Betting window has closed' };
  }
  if (competition.status !== 'live' && competition.status !== 'open') {
    return { ok: false, error: 'Competition is not accepting bets' };
  }

  // Verify agent is enrolled in this competition
  const agentEnrolled = await prisma.competitionAgent.findFirst({
    where: { competitionId, agentId: predictedWinnerId },
  });
  if (!agentEnrolled) return { ok: false, error: 'Predicted agent not in this competition' };

  // Prevent double-betting from same wallet
  const existing = await prisma.spectatorBet.findFirst({
    where: { competitionId, betterWallet: betterWallet.toLowerCase() },
  });
  if (existing) return { ok: false, error: 'You already placed a bet on this competition' };

  // Replay protection on tx signature
  const usedSig = await prisma.spectatorBet.findFirst({
    where: { txSignature },
  });
  if (usedSig) return { ok: false, error: 'Signature already used' };

  await prisma.$transaction([
    prisma.spectatorBet.create({
      data: {
        competitionId, predictedWinnerId, amountUsdc, txSignature,
        betterWallet:  betterWallet.toLowerCase(),
        betterAgentId: betterAgentId ?? null,
      },
    }),
    prisma.competition.update({
      where: { id: competitionId },
      data:  { totalBetUsdc: { increment: amountUsdc }, spectators: { increment: 1 } },
    }),
  ]);

  console.log(`[bet] ${betterWallet.slice(0,10)} bet $${amountUsdc} on ${predictedWinnerId} in ${competitionId}`);
  return { ok: true };
}

// ── Get live odds for a competition ──────────────────────────────────────────
export async function getLiveOdds(competitionId: string): Promise<{
  totalBetUsdc:   number;
  bettingOpen:    boolean;
  bettingClosedAt: string | null;
  odds: { agentId: string; name: string; amountBet: number; percentage: number; impliedOdds: string }[];
}> {
  const [competition, bets, agents] = await Promise.all([
    prisma.competition.findUnique({ where: { id: competitionId } }),
    prisma.spectatorBet.findMany({ where: { competitionId } }),
    prisma.competitionAgent.findMany({ where: { competitionId }, include: { agent: true } }),
  ]);

  if (!competition) throw new Error('Competition not found');

  const totalBet = bets.reduce((s, b) => s + b.amountUsdc, 0);

  const odds = agents.map(ca => {
    const amountBet = bets.filter(b => b.predictedWinnerId === ca.agentId).reduce((s, b) => s + b.amountUsdc, 0);
    const percentage = totalBet > 0 ? (amountBet / totalBet) * 100 : 50;
    // Implied odds: $1 bet returns totalBet * 0.9 / amountBet (simplified)
    const impliedPayout = amountBet > 0 ? ((totalBet * (1 - PLATFORM_RAKE)) / amountBet).toFixed(2) : 'N/A';

    return { agentId: ca.agentId, name: ca.agent.name, amountBet, percentage, impliedOdds: `${impliedPayout}x` };
  });

  return {
    totalBetUsdc:    totalBet,
    bettingOpen:     competition.bettingOpen,
    bettingClosedAt: competition.bettingClosedAt?.toISOString() ?? null,
    odds,
  };
}

// ── Settle bets after competition ends ────────────────────────────────────────
export async function settleBets(competitionId: string, winnerId: string) {
  const bets = await prisma.spectatorBet.findMany({ where: { competitionId } });
  if (bets.length === 0) return;

  const totalPool    = bets.reduce((s, b) => s + b.amountUsdc, 0);
  const payoutPool   = totalPool * (1 - PLATFORM_RAKE);
  const winnerBets   = bets.filter(b => b.predictedWinnerId === winnerId);
  const winnerTotal  = winnerBets.reduce((s, b) => s + b.amountUsdc, 0);

  await Promise.all(bets.map(async bet => {
    const correct   = bet.predictedWinnerId === winnerId;
    const payoutUsdc = correct && winnerTotal > 0
      ? (bet.amountUsdc / winnerTotal) * payoutPool
      : 0;

    await prisma.spectatorBet.update({
      where: { id: bet.id },
      data:  { isCorrect: correct, payoutUsdc, settledAt: new Date() },
    });
  }));

  // Close betting
  await prisma.competition.update({
    where: { id: competitionId },
    data:  { bettingOpen: false },
  });

  console.log(`[bet] Settled ${bets.length} bets. Pool: $${totalPool.toFixed(2)}. Winner pot: $${payoutPool.toFixed(2)}`);
}

// ── Get a wallet's claimable bets ─────────────────────────────────────────────
export async function getClaimableBets(walletAddress: string) {
  return prisma.spectatorBet.findMany({
    where: {
      betterWallet: walletAddress.toLowerCase(),
      isCorrect:    true,
      claimed:      false,
      settledAt:    { not: null },
    },
    include: { competition: { select: { title: true, status: true } } },
  });
}
