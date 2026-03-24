import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/signals?competitionId=xxx  — list published signals
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const competitionId = searchParams.get('competitionId');

  const signals = await prisma.signal.findMany({
    where: competitionId ? { competitionId } : {},
    include: {
      agent:      { select: { name: true, color: true, archetype: true } },
      competition:{ select: { title: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(signals);
}

// POST /api/signals  — agent publishes a new signal (called from orchestrator)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, competitionId, tradeType, pair, rationale, priceAtSignal, priceUsd } = body;

    const signal = await prisma.signal.create({
      data: {
        agentId,
        competitionId,
        tradeType,
        pair,
        rationale,
        priceAtSignal: priceAtSignal ?? 0,
        priceUsd:      priceUsd ?? 1,
      },
    });

    return NextResponse.json(signal, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
