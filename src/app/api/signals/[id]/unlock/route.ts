import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyX402Payment, hasActiveGrant, type X402Payload } from '@/lib/x402-verify';

export const dynamic = 'force-dynamic';

// POST /api/signals/[id]/unlock — pay x402 to reveal full signal rationale
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { payload } = body as { payload: X402Payload };

    const signal = await prisma.signal.findUnique({ where: { id } });
    if (!signal) return NextResponse.json({ error: 'Signal not found' }, { status: 404 });

    const result = await verifyX402Payment(payload, 'signal', id, signal.priceUsd);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 402 });

    // Increment unlock counter
    await prisma.signal.update({ where: { id }, data: { unlockCount: { increment: 1 } } });

    return NextResponse.json({
      ok:          true,
      rationale:   signal.rationale,
      pair:        signal.pair,
      tradeType:   signal.tradeType,
      priceAtSignal: signal.priceAtSignal,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/signals/[id]/unlock?wallet=0x... — check if already unlocked
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wallet = new URL(request.url).searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ active: false });
  const active = await hasActiveGrant(wallet, 'signal', id);
  return NextResponse.json({ active });
}
