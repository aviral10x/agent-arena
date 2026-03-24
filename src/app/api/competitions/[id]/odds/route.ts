import { NextResponse } from 'next/server';
import { getLiveOdds } from '@/lib/betting';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const odds = await getLiveOdds(id);
    return NextResponse.json(odds);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
