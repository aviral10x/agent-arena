import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyX402Payment, type X402Payload } from '@/lib/x402-verify';
import { initGameState, type TrainerStrategy } from '@/lib/game-engine';

export const dynamic = 'force-dynamic';

const ENTRY_FEE_USDC = 0.10;

/** Generate a default strategy based on agent archetype */
function generateArchetypeStrategy(archetype: string): TrainerStrategy {
  const a = (archetype ?? '').toLowerCase();
  if (a.includes('power') || a.includes('smash') || a.includes('attacker')) {
    return { gameplan: 'aggressive', specialTiming: 'early', shotBias: { smash: 0.45, drop: 0.15, drive: 0.25, clear: 0.15 } };
  }
  if (a.includes('defensive') || a.includes('wall') || a.includes('endur')) {
    return { gameplan: 'defensive', specialTiming: 'late', shotBias: { smash: 0.10, drop: 0.20, drive: 0.15, clear: 0.55 } };
  }
  if (a.includes('trick') || a.includes('decept') || a.includes('net') || a.includes('finesse')) {
    return { gameplan: 'counter-attack', specialTiming: 'late', shotBias: { smash: 0.15, drop: 0.40, drive: 0.25, clear: 0.20 } };
  }
  if (a.includes('adaptive') || a.includes('all-round') || a.includes('allround')) {
    return { gameplan: 'balanced', specialTiming: 'late', shotBias: { smash: 0.25, drop: 0.25, drive: 0.25, clear: 0.25 } };
  }
  // Default balanced
  return { gameplan: 'balanced', specialTiming: 'late' };
}

// POST /api/challenges — create a 1v1 challenge between two agents
// Accepts optional x402 payload for $0.10 USDC entry fee.
// Without payload: demo mode (free, no USDC collected).
export async function POST(request: Request) {
  const limited = checkRateLimit(request, 10, 60_000); // 10 challenges/min
  if (limited) return limited;

  try {
    const { targetAgentId, challengerAgentId, type = 'trading', sport = 'badminton', payload, strategy } = await request.json() as {
      targetAgentId: string;
      challengerAgentId: string;
      type?: string;
      sport?: string;
      payload?: X402Payload;
      strategy?: TrainerStrategy;
    };

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

    // ── Verify x402 payment if payload provided ──
    let paidEntry = false;
    if (payload && payload.from && payload.signature) {
      const resourceId = `${challengerAgentId}:${targetAgentId}`;
      const verified = await verifyX402Payment(payload, 'challenge', resourceId, ENTRY_FEE_USDC);
      if (!verified.ok) {
        return NextResponse.json({ error: verified.error }, { status: 402 });
      }
      paidEntry = true;
      console.log(`[challenge] x402 entry fee verified: $${ENTRY_FEE_USDC} from ${payload.from}`);
    } else {
      console.log('[challenge] demo mode — no x402 payment');
    }

    const bankroll = 1; // $1 for hackathon testing

    // Initialize game state with trainer strategies for BOTH agents
    const initialGameState = initGameState('badminton' as const, [challengerAgentId, targetAgentId], challengerAgentId);

    // Auto-generate opponent strategy based on their archetype
    const opponentStrategy = generateArchetypeStrategy((target as any).archetype ?? 'balanced');

    (initialGameState as any).strategies = {
      [challengerAgentId]: strategy ?? { gameplan: 'balanced' as const, specialTiming: 'late' as const },
      [targetAgentId]: opponentStrategy,
    };

    console.log(`[challenge] ${challenger.name}: ${strategy?.gameplan ?? 'balanced'} | ${target.name}: ${opponentStrategy.gameplan}`);

    const competition = await prisma.competition.create({
      data: {
        title:          `${challenger.name} vs ${target.name}`,
        mode:           '1v1',
        status:         'live',       // starts immediately since both agents are present
        durationSeconds: parseInt(process.env.COMPETITION_DURATION_SECS ?? '30'), // 30s fast matches
        duration:       '30s',
        countdown:      '0:30 remaining',
        entryFee:       paidEntry ? '$0.10 x402' : '$0.00 demo',
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
        gameState:      JSON.stringify(initialGameState),
        isTicking:      false, // PartyKit drives ticks for sport matches
        // Betting open for the full 30s match duration
        bettingOpen:    true,
        bettingClosedAt: new Date(Date.now() + 30 * 1000),
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

    return NextResponse.json({
      ...competition,
      liveUrl: `/competitions/${competition.id}/live`,
      partyRoomId: competition.id,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[challenge]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
