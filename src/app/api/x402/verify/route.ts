import { NextResponse } from 'next/server';
import { verifyX402Payment, hasActiveGrant, type X402Payload } from '@/lib/x402-verify';

export const dynamic = 'force-dynamic';

// Pricing table (USD) — reduced for hackathon testing
const PRICES: Record<string, number> = {
  leaderboard: 0.01,
  replay:      0.05,
  signal:      0.01,
  bet:         0.01, // minimum for bet verification
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resourceType, resourceId, payload } = body as {
      resourceType: string;
      resourceId:   string;
      payload:      X402Payload;
    };

    if (!resourceType || !resourceId || !payload) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const expectedUsd = PRICES[resourceType] ?? 1;
    const result = await verifyX402Payment(payload, resourceType, resourceId, expectedUsd);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 402 });
    }

    return NextResponse.json({ ok: true, wallet: result.wallet, resourceType, resourceId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 });
  }
}

// Check if wallet has an active grant (used by client to skip payment flow)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet       = searchParams.get('wallet');
    const resourceType = searchParams.get('resourceType');
    const resourceId   = searchParams.get('resourceId');

    if (!wallet || !resourceType || !resourceId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const active = await hasActiveGrant(wallet, resourceType, resourceId);
    return NextResponse.json({ active });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
