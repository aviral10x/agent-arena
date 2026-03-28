import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { placeBet } from '@/lib/betting';
import { verifyX402Payment, type X402Payload } from '@/lib/x402-verify';
import { rateLimit, getRequestIp, addRateLimitHeaders } from '@/lib/rate-limit';
import { createPublicClient, http } from 'viem';
import { xLayerTestnet } from 'wagmi/chains';
import { ACTIVE_CHAIN } from '@/lib/chain-config';

export const dynamic = 'force-dynamic';

// GET /api/competitions/[id]/bet?wallet=... — fetch bets for this competition
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wallet = req.nextUrl.searchParams.get('wallet')?.toLowerCase();

  const where: any = { competitionId: id };
  if (wallet) where.betterWallet = wallet;

  const bets = await prisma.spectatorBet.findMany({
    where,
    orderBy: { paidAt: 'desc' },
    take: 50,
    select: {
      id: true,
      betterWallet: true,
      predictedWinnerId: true,
      amountUsdc: true,
      txSignature: true,
      paidAt: true,
      isCorrect: true,
      payoutUsdc: true,
      settledAt: true,
    },
  });

  return NextResponse.json(bets);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Rate limit: 5 bets per minute per IP
    const rl = rateLimit(getRequestIp(req), 5, 60_000);
    if (!rl.ok) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      addRateLimitHeaders(headers, rl);
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers });
    }
    const body = await req.json();
    const { betterWallet, predictedWinnerId, amountUsdc, txHash, payload, betterAgentId } = body as {
      betterWallet:      string;
      predictedWinnerId: string;
      amountUsdc:        number;
      txHash?:           string; // Real on-chain tx hash from ERC-20 transfer
      payload?:          X402Payload;
      betterAgentId?:    string;
    };

    if (!betterWallet || !predictedWinnerId || !amountUsdc) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (amountUsdc < 0.01) return NextResponse.json({ error: 'Minimum bet is $0.01' }, { status: 400 });
    if (amountUsdc > 100)  return NextResponse.json({ error: 'Maximum bet is $100' },  { status: 400 });

    // Real on-chain bet: txHash is a real XLayer tx hash — verify receipt
    // Demo fallback: if no txHash, allow demo bets up to $10
    const txSig = txHash ?? (payload as any)?.txSignature ?? `demo_${Date.now()}`;

    if (txHash && txHash.startsWith('0x')) {
      // Verify the tx exists on-chain (non-blocking — don't fail if RPC is slow)
      try {
        const client = createPublicClient({ chain: xLayerTestnet, transport: http(ACTIVE_CHAIN.rpc) });
        const receipt = await Promise.race([
          client.getTransactionReceipt({ hash: txHash as `0x${string}` }),
          new Promise<null>(r => setTimeout(() => r(null), 5000)),
        ]);
        if (receipt && receipt.status === 'success') {
          console.log(`[bet] On-chain tx verified: ${txHash.slice(0, 18)}... block ${receipt.blockNumber}`);
        } else if (receipt && receipt.status === 'reverted') {
          return NextResponse.json({ error: 'Transaction reverted on-chain' }, { status: 400 });
        }
        // If receipt is null (timeout), allow anyway — tx may still be pending
      } catch {
        // RPC error — allow bet, tx will be verified later
      }
    } else if (!txHash) {
      // Demo mode: cap at $10
      if (amountUsdc > 10) return NextResponse.json({ error: 'Demo bets capped at $10 — connect wallet for real bets' }, { status: 400 });
    }

    const result = await placeBet(id, betterWallet, predictedWinnerId, amountUsdc, txSig, betterAgentId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ ok: true, competitionId: id, predictedWinnerId, amountUsdc, txHash: txSig });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
