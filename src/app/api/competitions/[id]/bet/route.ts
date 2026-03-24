import { NextResponse } from 'next/server';
import { placeBet } from '@/lib/betting';
import { verifyX402Payment, type X402Payload } from '@/lib/x402-verify';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
    if (amountUsdc < 1) return NextResponse.json({ error: 'Minimum bet is $1' }, { status: 400 });

    // Verify x402 payment
    const verified = await verifyX402Payment(payload, 'bet', `${id}:${betterWallet}`, amountUsdc);
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 402 });

    const result = await placeBet(id, betterWallet, predictedWinnerId, amountUsdc, payload.signature, betterAgentId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ ok: true, competitionId: id, predictedWinnerId, amountUsdc });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
