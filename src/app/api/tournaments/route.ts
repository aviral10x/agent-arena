import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createTournament, ensureFridayRoyale } from '@/lib/tournaments';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Ensure a Friday Royale always exists
  await ensureFridayRoyale().catch(() => {});

  const [upcoming, live, settled] = await Promise.all([
    prisma.tournament.findMany({
      where:   { status: { in: ['upcoming', 'enrolling'] } },
      include: { slots: { include: { agent: { select: { id: true, name: true, color: true } } } } },
      orderBy: { startAt: 'asc' },
      take: 10,
    }),
    prisma.tournament.findMany({
      where:   { status: 'live' },
      include: { slots: { include: { agent: { select: { id: true, name: true, color: true } } } }, competitions: { select: { id: true, status: true } } },
    }),
    prisma.tournament.findMany({
      where:   { status: 'settled' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ]);

  return NextResponse.json({ upcoming, live, settled });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const t = await createTournament({
      title:         body.title,
      description:   body.description,
      mode:          body.mode ?? 'royale',
      startAt:       new Date(body.startAt),
      endAt:         body.endAt ? new Date(body.endAt) : undefined,
      entryFeeUsdc:  body.entryFeeUsdc ?? 0.10,
      prizePoolUsdc: body.prizePoolUsdc ?? 1,
      maxAgents:     body.maxAgents ?? 8,
      isRecurring:   body.isRecurring ?? false,
      recurringTag:  body.recurringTag,
    });
    return NextResponse.json(t, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
