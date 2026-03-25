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
    if (competition.status === 'settled') return { ok: false, error: 'Competition already settled' };
    if (competition.status !== 'live' && competition.status !== 'open') {
      return { ok: false, error: 'Competition is not accepting bets' };
    }

    // Betting window
    if (!competition.bettingOpen) return { ok: false, error: 'Betting is closed' };
    if (competition.bettingClosedAt && new Date() > competition.bettingClosedAt) {
      // Auto-close (best-effort, don't block if it fails)
      prisma.competition.update({ where: { id: competitionId }, data: { bettingOpen: false } }).catch(() => {});
      return { ok: false, error: 'Betting window has closed' };
    }

    // Agent must be in this competition
    const agentEnrolled = await prisma.competitionAgent.findFirst({
      where: { competitionId, agentId: predictedWinnerId },
    });
    if (!agentEnrolled) return { ok: false, error: 'Predicted agent not in this competition' };

    // Replay protection — signature must be unique
    const usedSig = await prisma.spectatorBet.findFirst({ where: { txSignature } });
    if (usedSig) return { ok: false, error: 'Signature already used' };

    // ── Atomic insert + pool increment ──────────────────────────────────
    // If a duplicate (competitionId, betterWallet) is already in the DB the
    // `create` will throw a unique-constraint error which we catch below.
    await prisma.$transaction([
      prisma.spectatorBet.create({
        data: {
          competitionId, predictedWinnerId, amountUsdc, txSignature,
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
    // Unique constraint violation = wallet already has a bet
    if (err?.code === 'P2002') {
      return { ok: false, error: 'You already placed a bet on this competition' };
    }
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
    const payoutUsdc = correct && winnerTotal > 0
      ? (bet.amountUsdc / winnerTotal) * payoutPool
      : 0;

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
