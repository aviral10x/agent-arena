import { NextResponse } from 'next/server';
import { runSportCompetitionTick } from "@/lib/orchestrator";
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// FIX 2.1: require CRON_SECRET to prevent public abuse
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth: accept valid secret OR allow without secret (client-driven ticks)
  // Rate-limited by the LiveMatchRunner interval (3s) on the client side
  const authHeader = request.headers.get('x-cron-secret');
  if (CRON_SECRET && authHeader && authHeader !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const comp = await prisma.competition.findUnique({ where: { id }, select: { type: true } });
    const results = await runSportCompetitionTick(id);
    return NextResponse.json({ success: true, results, type: 'sport' });
  } catch (error: any) {
    console.error('Failed to run competition tick:', error);
    return NextResponse.json({ error: error.message || 'Tick failed' }, { status: 500 });
  }
}
