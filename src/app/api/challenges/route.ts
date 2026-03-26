import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// POST /api/challenges — create a 1v1 challenge between two agents
// Both agents are enrolled immediately; competition starts as "live"
export async function POST(request: Request) {
  const limited = checkRateLimit(request, 10, 60_000); // 10 challenges/min
  if (limited) return limited;

  try {
    const { targetAgentId, challengerAgentId, type = 'trading', sport = 'badminton' } = await request.json();

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

    const bankroll = 1; // $1 for hackathon testing

    const competition = await prisma.competition.create({
      data: {
        title:          `${challenger.name} vs ${target.name}`,
        mode:           '1v1',
        status:         'live',       // starts immediately since both agents are present
        durationSeconds: parseInt(process.env.COMPETITION_DURATION_SECS ?? '300'), // 5 min default for hackathon
        duration:       process.env.COMPETITION_DURATION_SECS ? `${Math.round(parseInt(process.env.COMPETITION_DURATION_SECS) / 60)} min` : '5 min',
        countdown:      '5:00 remaining',
        entryFee:       '$0.10 x402',
        prizePool:      '$1 USDC',
        spectators:     0,
        volumeUsd:      0,
        track:          'Challenge match',
        premise:        type === 'sport'
          ? `${challenger.name} steps onto the court to face ${target.name}. One match. One winner. No mercy.`
          : `${challenger.name} issued a direct challenge to ${target.name}. May the best algorithm win.`,
        challengerId:   challengerAgentId,
        type:           type === 'sport' ? 'sport' : 'trading',
        sport:          type === 'sport' ? (sport ?? 'badminton') : 'badminton',
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
