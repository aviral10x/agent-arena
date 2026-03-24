import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();

  try {
    // DB ping — lightweight query
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - start;

    // Check live competition count
    const liveCount = await prisma.competition.count({ where: { status: 'live' } });

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: { status: 'ok', latencyMs: dbLatencyMs },
      arena: { liveCompetitions: liveCount },
      version: process.env.npm_package_version ?? '0.1.0',
      uptime: Math.floor(process.uptime()),
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      db: { status: 'error', error: err.message },
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
