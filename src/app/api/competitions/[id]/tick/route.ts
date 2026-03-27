import { NextResponse } from 'next/server';
import { runSportCompetitionTick } from "@/lib/orchestrator";
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // No auth — ticks are client-driven, rate-limited by LiveMatchRunner (3s interval)

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
