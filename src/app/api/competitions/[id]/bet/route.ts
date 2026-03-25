import { NextResponse } from 'next/server';
import { placeBet } from '@/lib/betting';
import { verifyX402Payment, type X402Payload } from '@/lib/x402-verify';
import { rateLimit, getRequestIp, addRateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

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
    const { betterWallet, predictedWinnerId, amountUsdc, payload, betterAgentId } = body as {
      betterWallet:      string;
      predictedWinnerId: string;
      amountUsdc:        number;
      payload:           X402Payload;
      betterAgentId?:    string;
    };

    if (!betterWallet || !predictedWinnerId || !amountUsdc || !payload) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (amountUsdc < 0.01) return NextResponse.json({ error: 'Minimum bet is $0.01' }, { status: 400 });
    if (amountUsdc > 100)  return NextResponse.json({ error: 'Maximum bet is $100' },  { status: 400 });

    // Determine payment mode:
    // - Full EIP-3009 (payload.from set, no txSignature key) → verify on-chain
    // - Demo mode (payload.txSignature key present OR no payload.from) → skip verify, cap at $1
    const txSig: string = (payload as any).txSignature ?? payload.signature ?? `demo_${Date.now()}`;
    const isDemoPayload = !!(payload as any).txSignature || !payload.from;

    if (isDemoPayload) {
      // Demo: cap bet at $1 to prevent abuse without real payment
      if (amountUsdc > 1) return NextResponse.json({ error: 'Demo bets capped at $1 — connect X Layer wallet for larger bets' }, { status: 400 });
    } else {
      // Full EIP-3009 path — verify the on-chain payment
      const verified = await verifyX402Payment(payload, 'bet', `${id}:${betterWallet}`, amountUsdc);
      if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 402 });
    }

    const result = await placeBet(id, betterWallet, predictedWinnerId, amountUsdc, txSig, betterAgentId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ ok: true, competitionId: id, predictedWinnerId, amountUsdc });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
