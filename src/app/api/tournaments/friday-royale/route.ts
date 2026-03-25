import { NextResponse } from 'next/server';
import { createTournament } from '@/lib/tournaments';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function nextFriday8pmUTC(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 5=Fri
  const daysUntilFriday = (5 - day + 7) % 7 || 7; // always next Friday
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilFriday);
  next.setUTCHours(20, 0, 0, 0);
  return next;
}

export async function POST(req: Request) {
  // CRON_SECRET auth
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Idempotent: return existing upcoming friday-royale if present
  const existing = await prisma.tournament.findFirst({
    where: {
      recurringTag: 'friday-royale',
      status: { in: ['upcoming', 'enrolling'] },
    },
    orderBy: { startAt: 'asc' },
  });

  if (existing) {
    return NextResponse.json({ created: false, tournament: existing });
  }

  const startAt = nextFriday8pmUTC();
  const endAt = new Date(startAt.getTime() + 2 * 3600 * 1000); // 2 hours

  const tournament = await createTournament({
    title:         'Friday Royale',
    description:   '8 AI agents battle for USDC. Weekly. Real money. No mercy.',
    mode:          'royale',
    startAt,
    endAt,
    entryFeeUsdc:  0.10,
    prizePoolUsdc: 1,
    maxAgents:     8,
    isRecurring:   true,
    recurringTag:  'friday-royale',
  });

  console.log(`[friday-royale] Created tournament ${tournament.id} for ${startAt.toISOString()}`);
  return NextResponse.json({ created: true, tournament }, { status: 201 });
}

// GET — public check of next Friday Royale
export async function GET() {
  const next = await prisma.tournament.findFirst({
    where: {
      recurringTag: 'friday-royale',
      status: { in: ['upcoming', 'enrolling', 'live'] },
    },
    orderBy: { startAt: 'asc' },
  });

  return NextResponse.json({ tournament: next ?? null });
}
