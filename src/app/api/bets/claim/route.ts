import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bets/claim?wallet=0x...
 * Returns all claimable (won + unclaimed) bets for a wallet.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet')?.toLowerCase();

  if (!wallet) {
    return NextResponse.json({ error: 'wallet parameter required' }, { status: 400 });
  }

  const claimable = await prisma.spectatorBet.findMany({
    where: {
      betterWallet: wallet,
      isCorrect: true,
      claimed: false,
      settledAt: { not: null },
    },
    include: {
      competition: { select: { id: true, title: true, status: true } },
    },
  });

  return NextResponse.json({
    wallet,
    claimable: claimable.map(b => ({
      id: b.id,
      competitionId: b.competitionId,
      competitionTitle: b.competition.title,
      amountBet: b.amountUsdc,
      payout: b.payoutUsdc,
      predictedWinnerId: b.predictedWinnerId,
      settledAt: b.settledAt?.toISOString(),
    })),
    totalClaimable: claimable.reduce((s, b) => s + b.payoutUsdc, 0),
  });
}

/**
 * POST /api/bets/claim
 * Body: { betId, walletAddress }
 * 
 * Marks a bet as claimed. In production, this would trigger an on-chain
 * USDC transfer to the winner's wallet. For now it records the claim.
 */
export async function POST(request: Request) {
  const limited = checkRateLimit(request, 10, 60_000);
  if (limited) return limited;

  try {
    const { betId, walletAddress } = await request.json();

    if (!betId || !walletAddress) {
      return NextResponse.json({ error: 'betId and walletAddress required' }, { status: 400 });
    }

    const bet = await prisma.spectatorBet.findUnique({ where: { id: betId } });

    if (!bet) {
      return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
    }
    if (bet.betterWallet !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Wallet mismatch' }, { status: 403 });
    }
    if (!bet.isCorrect) {
      return NextResponse.json({ error: 'Bet was not correct — no payout' }, { status: 400 });
    }
    if (bet.claimed) {
      return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
    }
    if (!bet.settledAt) {
      return NextResponse.json({ error: 'Competition not settled yet' }, { status: 400 });
    }

    // Mark as claimed
    // TODO: In production, trigger actual USDC transfer here via relayer wallet
    const updated = await prisma.spectatorBet.update({
      where: { id: betId },
      data: {
        claimed: true,
        claimedTxHash: `claim_${Date.now()}_${walletAddress.slice(0, 10)}`, // placeholder
      },
    });

    console.log(`[claim] Wallet ${walletAddress.slice(0, 10)} claimed $${bet.payoutUsdc.toFixed(2)} from bet ${betId}`);

    return NextResponse.json({
      ok: true,
      payout: updated.payoutUsdc,
      betId: updated.id,
    });
  } catch (err: any) {
    console.error('[claim]', err);
    return NextResponse.json({ error: err.message ?? 'Claim failed' }, { status: 500 });
  }
}
