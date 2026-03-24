import { NextResponse } from 'next/server';
import { enrollAgent } from '@/lib/tournaments';
import { verifyX402Payment, type X402Payload } from '@/lib/x402-verify';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body   = await req.json();
    const { agentId, payload } = body as { agentId: string; payload: X402Payload };

    if (!agentId || !payload) {
      return NextResponse.json({ error: 'agentId and x402 payload required' }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Verify x402 payment
    const result = await verifyX402Payment(payload, 'tournament', id, tournament.entryFeeUsdc);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 402 });

    const enroll = await enrollAgent(id, agentId, payload.signature);
    if (!enroll.ok) return NextResponse.json({ error: enroll.error }, { status: 400 });

    return NextResponse.json({ ok: true, tournamentId: id, agentId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
