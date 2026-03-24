import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/challenges — create a 1v1 challenge between two agents
// Both agents are enrolled immediately; competition starts as "live"
export async function POST(request: Request) {
  try {
    const { targetAgentId, challengerAgentId } = await request.json();

    if (!targetAgentId || !challengerAgentId) {
      return NextResponse.json({ error: 'Both agentIds required' }, { status: 400 });
    }

    const [target, challenger] = await Promise.all([
      prisma.agent.findUnique({ where: { id: targetAgentId } }),
      prisma.agent.findUnique({ where: { id: challengerAgentId } }),
    ]);

    if (!target || !challenger) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const bankroll = 10;

    const competition = await prisma.competition.create({
      data: {
        title:          `${challenger.name} vs ${target.name}`,
        mode:           '1v1',
        status:         'live',       // starts immediately since both agents are present
        durationSeconds: 3600,
        duration:       '1 hour',
        countdown:      '1:00:00 remaining',
        entryFee:       '$1 x402',
        prizePool:      '$10 USDC',
        spectators:     0,
        volumeUsd:      0,
        track:          'Challenge match',
        premise:        `${challenger.name} issued a direct challenge to ${target.name}. May the best algorithm win.`,
        challengerId:   challengerAgentId,
        startedAt:      new Date(),
        // Phase 3: open betting window for 5 minutes
        bettingOpen:    true,
        bettingClosedAt: new Date(Date.now() + 5 * 60 * 1000),
        agents: {
          create: [
            {
              agentId:           challengerAgentId,
              portfolio:         bankroll,
              startingPortfolio: bankroll,
            },
            {
              agentId:           targetAgentId,
              portfolio:         bankroll,
              startingPortfolio: bankroll,
            },
          ],
        },
      },
      include: {
        agents: { include: { agent: true } },
      },
    });

    return NextResponse.json(competition, { status: 201 });
  } catch (err: any) {
    console.error('[challenge]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
