import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAgenticWallet } from '@/lib/okx-os';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(agents.map((a: any) => ({ ...a, traits: JSON.parse(a.traits) })));
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bankroll = parseFloat(body.bankroll ?? '10');

    const agent = await prisma.agent.create({
      data: {
        name:      body.name,
        archetype: body.archetype,
        strategy:  body.strategy,
        risk:      body.risk,
        color:     body.color ?? '#66e3ff',
        owner:     body.owner ?? 'Anonymous',
        wallet:    createAgenticWallet().address,
        bio:       body.description ?? '',
        traits:    JSON.stringify(body.traits ?? []),
      },
    });

    // FIX 4.1: auto-enroll into oldest open competition with a free slot
    const openComp = await prisma.competition.findFirst({
      where: { status: 'open' },
      include: { agents: true },
      orderBy: { createdAt: 'asc' },
    });

    let enrolledCompetitionId: string | null = null;

    if (openComp) {
      const maxSlots = openComp.mode === '1v1' ? 2 : 4;
      const hasSlot  = openComp.agents.length < maxSlots;

      if (hasSlot) {
        await prisma.competitionAgent.create({
          data: {
            competitionId:     openComp.id,
            agentId:           agent.id,
            portfolio:         bankroll,
            startingPortfolio: bankroll,
          },
        });
        enrolledCompetitionId = openComp.id;

        // FIX 3.3: if competition now full, flip it to live
        const freshCount = openComp.agents.length + 1; // +1 for the one we just added
        if (freshCount >= maxSlots) {
          await prisma.competition.update({
            where: { id: openComp.id },
            data:  { status: 'live', startedAt: new Date() },
          });
          console.log(`[lifecycle] Competition ${openComp.id} is now LIVE`);
        }
      }
    }

    return NextResponse.json(
      {
        ...agent,
        traits: JSON.parse(agent.traits),
        enrolledCompetitionId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
