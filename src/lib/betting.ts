/**
 * Spectator betting engine
 * - Accept x402 bets before a competition starts
 * - Calculate live odds
 * - Settle payouts after competition ends
 * - 10% platform rake, 90% to correct bettors
 */

import { prisma } from './db';

const PLATFORM_RAKE = 0.10; // 10%
const MAX_BET_USDC  = 100;  // cap per bet to prevent abuse

// ── Place a bet ───────────────────────────────────────────────────────────────
export async function placeBet(
  competitionId:     string,
  betterWallet:      string,
  predictedWinnerId: string,
  amountUsdc:        number,
  txSignature:       string,
  betterAgentId?:    string
): Promise<{ ok: boolean; error?: string }> {

  // Amount bounds
  if (amountUsdc < 0.01) return { ok: false, error: 'Minimum bet is $0.01' };
  if (amountUsdc > MAX_BET_USDC) return { ok: false, error: `Maximum bet is $${MAX_BET_USDC}` };

  const wallet = betterWallet.toLowerCase();

  // ── Atomic write with uniqueness constraint to prevent race conditions ──
  // We rely on the DB's unique constraint on (competitionId, betterWallet) to
  // reject duplicate bets even under concurrent requests. The preliminary
  // checks below are fast-fail guards, not the only protection.
  try {
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) return { ok: false, error: 'Competition not found' };
    if (competition.status === 'settled') return { ok: false, error: 'Match already ended' };
    // Allow bets anytime during live match — no betting window restriction
    if (competition.status !== 'live' && competition.status !== 'open') {
      return { ok: false, error: 'Match is not live' };
    }

    // Agent must be in this competition
    const agentEnrolled = await prisma.competitionAgent.findFirst({
      where: { competitionId, agentId: predictedWinnerId },
    });
    if (!agentEnrolled) return { ok: false, error: 'Predicted agent not in this competition' };

    // ── Atomic insert + pool increment ──────────────────────────────────
    // Allow multiple bets per wallet (no unique constraint on wallet+comp)
    await prisma.$transaction([
      prisma.spectatorBet.create({
        data: {
          competitionId, predictedWinnerId, amountUsdc,
          txSignature: `${txSignature}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          betterWallet:  wallet,
          betterAgentId: betterAgentId ?? null,
        },
      }),
      prisma.competition.update({
        where: { id: competitionId },
        data:  { totalBetUsdc: { increment: amountUsdc }, spectators: { increment: 1 } },
      }),
    ]);

    console.log(`[bet] ${wallet.slice(0, 10)} bet $${amountUsdc} on ${predictedWinnerId} in ${competitionId}`);
    return { ok: true };

  } catch (err: any) {
    console.error('[bet] placeBet error:', err?.message);
    return { ok: false, error: 'Failed to place bet — please try again' };
  }
}

// ── Get live odds for a competition ──────────────────────────────────────────
export async function getLiveOdds(competitionId: string): Promise<{
  totalBetUsdc:    number;
  bettingOpen:     boolean;
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
    const amountBet = bets
      .filter(b => b.predictedWinnerId === ca.agentId)
      .reduce((s, b) => s + b.amountUsdc, 0);

    const percentage = totalBet > 0 ? (amountBet / totalBet) * 100 : 50;

    // Implied payout: if you bet $1 and win, you get back (pool * 0.9 / yourSideTotal)
    const impliedPayout = amountBet > 0
      ? ((totalBet * (1 - PLATFORM_RAKE)) / amountBet).toFixed(2)
      : 'N/A';

    return {
      agentId: ca.agentId,
      name: ca.agent.name,
      amountBet,
      percentage: Math.round(percentage * 10) / 10,
      impliedOdds: `${impliedPayout}x`,
    };
  });

  return {
    totalBetUsdc:    totalBet,
    bettingOpen:     competition.bettingOpen,
    bettingClosedAt: competition.bettingClosedAt?.toISOString() ?? null,
    odds,
  };
}

// ── Settle bets after competition ends ───────────────────────────────────────
export async function settleBets(competitionId: string, winnerId: string) {
  const bets = await prisma.spectatorBet.findMany({ where: { competitionId } });
  if (bets.length === 0) {
    console.log(`[bet] No bets to settle for ${competitionId}`);
    return;
  }

  const totalPool   = bets.reduce((s, b) => s + b.amountUsdc, 0);
  const payoutPool  = totalPool * (1 - PLATFORM_RAKE);
  const winnerBets  = bets.filter(b => b.predictedWinnerId === winnerId);
  const winnerTotal = winnerBets.reduce((s, b) => s + b.amountUsdc, 0);
  const settledAt   = new Date();

  // ── Single atomic transaction — all bets settle or none do ──────────
  const updates = bets.map(bet => {
    const correct    = bet.predictedWinnerId === winnerId;
    let payoutUsdc = 0;
    if (correct && winnerTotal > 0) {
      // Normal payout: proportional share of the pool
      payoutUsdc = (bet.amountUsdc / winnerTotal) * payoutPool;
    } else if (winnerTotal === 0) {
      // Nobody bet on the winner — refund everyone (minus rake)
      payoutUsdc = bet.amountUsdc * (1 - PLATFORM_RAKE);
    }

    return prisma.spectatorBet.update({
      where: { id: bet.id },
      data:  { isCorrect: correct, payoutUsdc, settledAt },
    });
  });

  // Close betting window atomically with settlement
  const closeComp = prisma.competition.update({
    where: { id: competitionId },
    data:  { bettingOpen: false },
  });

  await prisma.$transaction([...updates, closeComp]);

  const correctCount = winnerBets.length;
  console.log(
    `[bet] Settled ${bets.length} bets for ${competitionId}. ` +
    `Pool: $${totalPool.toFixed(2)} → payout pool $${payoutPool.toFixed(2)} ` +
    `to ${correctCount} winner${correctCount !== 1 ? 's' : ''}.`
  );
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
    include: { competition: { select: { id: true, title: true, status: true } } },
  });
}
