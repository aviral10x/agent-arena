import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const trades = await prisma.trade.findMany({
    take: 20,
    orderBy: { timestamp: 'desc' },
    include: { agent: { select: { name: true, color: true } } },
  });
  return NextResponse.json(trades);
}
