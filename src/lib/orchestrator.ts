import { prisma } from './db';
import { onCompetitionSettle } from './stats';
import { settleBets } from './betting';
import { initGameState, resolveRally, resolveFullRally, type GameState, type ShotDecision, type BatchRallyResult } from './game-engine';
import { executeSportAgentTurn, type SportAgent } from './sport-agent-runner';

// FIX 1.3: relative timestamp from actual DB timestamp
export function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

// FIX 1.2: format raw USD number for display
export function formatVolume(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}k`;
  return `$${usd.toFixed(0)}`;
}

// FIX 3.1 + 3.2: settle competition, declare winner
export async function settleCompetition(competitionId: string) {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: { agents: { include: { agent: true } } }
  });
  if (!competition || competition.status === 'settled') return;

  // Winner = highest portfolio value
  const winner = competition.agents.reduce(
    (best, ca) => (ca.portfolio > (best?.portfolio ?? 0) ? ca : best),
    competition.agents[0]
  );

  await prisma.competition.update({
    where: { id: competitionId },
    data: {
      status:    'settled',
      winnerId:  winner?.agentId ?? null,
      isTicking: false,
      bettingOpen: false,
    }
  });

  console.log(`[settle] Competition ${competitionId} settled. Winner: ${winner?.agent?.name}`);

  // Update global stats + agent cards + leaderboard ranks
  await onCompetitionSettle(competitionId).catch(e =>
    console.error('[settle] stats update failed:', e.message)
  );

  // Settle spectator bets
  if (winner?.agentId) {
    await settleBets(competitionId, winner.agentId).catch(e =>
      console.error('[settle] bet settlement failed:', e.message)
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPORT COMPETITION TICK
// Replaces trading tick for competition.type === "sport"
// ═══════════════════════════════════════════════════════════════════════════════
export async function runSportCompetitionTick(competitionId: string) {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: { agents: { include: { agent: true } } },
  });

  if (!competition) throw new Error('Competition not found');
  if (competition.status !== 'live') throw new Error('Competition is not live');
  if (competition.isTicking) {
    console.log(`[sport-tick] ${competitionId} already ticking, skipping`);
    return [];
  }

  // Auto-settle if time expired
  if (competition.startedAt) {
    const elapsed = (Date.now() - competition.startedAt.getTime()) / 1000;
    if (elapsed >= competition.durationSeconds) {
      await settleCompetition(competitionId);
      return [{ settled: true }];
    }
  }

  // Acquire tick lock
  await prisma.competition.update({
    where: { id: competitionId },
    data: { isTicking: true },
  });

  try {
    const agentIds = competition.agents.map(ca => ca.agentId);

    // Load or initialise game state
    let gameState: GameState = (competition as any).gameState
      ? JSON.parse((competition as any).gameState as string)
      : initGameState(
          'badminton' as const,
          agentIds,
          agentIds[0]
        );

    // If already over, settle immediately
    if (gameState.matchOver) {
      await settleCompetition(competitionId);
      return [{ settled: true }];
    }

    // Build agent lookup maps
    const agentMap = Object.fromEntries(
      competition.agents.map(ca => {
        const a = ca.agent as any;
        return [a.id, {
          agent: a,
          sportAgent: {
            ...a,
            speed:        a.speed        ?? 7,
            power:        a.power        ?? 7,
            stamina:      a.stamina      ?? 7,
            accuracy:     a.accuracy     ?? 7,
            specialMoves: a.specialMoves ?? '[]',
          } as SportAgent,
        }];
      })
    );

    const agentStats = Object.fromEntries(
      competition.agents.map(ca => {
        const a = ca.agent as any;
        return [a.id, {
          speed:    a.speed    ?? 7,
          power:    a.power    ?? 7,
          accuracy: a.accuracy ?? 7,
          stamina:  a.stamina  ?? 7,
        }];
      })
    );

    // Decision function: tries AI (LLM), falls back to stats-based random
    const preComputed = (gameState as any).preComputedDecisions ?? {};
    const decisionFn = async (state: GameState, attackerId: string): Promise<ShotDecision> => {
      // Trainer pre-computed decision takes priority
      if (preComputed[attackerId]) {
        const d = preComputed[attackerId];
        delete preComputed[attackerId];
        console.log(`[sport-tick] Using trainer decision for ${agentMap[attackerId]?.agent?.name}: ${d.action}`);
        return d;
      }

      const entry = agentMap[attackerId];
      if (!entry) {
        return { action: 'DRIVE', targetZone: 5, rationale: 'fallback' };
      }

      const opponentId = agentIds.find(id => id !== attackerId) ?? '';
      const opponentName = agentMap[opponentId]?.agent?.name ?? 'Opponent';

      try {
        return await executeSportAgentTurn(entry.sportAgent, state, opponentId, opponentName);
      } catch (err: any) {
        console.warn(`[sport-tick] LLM failed for ${entry.agent.name}: ${err.message?.slice(0, 80)}`);
        const actions: Array<'SMASH' | 'DROP' | 'CLEAR' | 'DRIVE' | 'LOB'> = ['SMASH', 'DROP', 'CLEAR', 'DRIVE', 'LOB'];
        return {
          action: actions[Math.floor(Math.random() * actions.length)],
          targetZone: Math.floor(Math.random() * 9) + 1,
          specialMove: null,
          rationale: 'Tactical fallback.',
        };
      }
    };

    // ═══ BATCH RALLY: compute entire rally (serve to point) in one call ═══
    const batchResult: BatchRallyResult = await resolveFullRally(
      gameState,
      agentStats,
      decisionFn,
      30, // max shots safety cap
    );

    // Persist cleared pre-computed decisions
    (batchResult.finalGameState as any).preComputedDecisions = preComputed;
    gameState = batchResult.finalGameState;

    // Persist final game state
    await prisma.competition.update({
      where: { id: competitionId },
      data: {
        gameState:    JSON.stringify(gameState),
        totalRallies: { increment: 1 },
        isTicking:    false,
      },
    });

    // If a point was scored, update CompetitionAgent scores + momentum
    if (batchResult.pointWinnerId) {
      await prisma.competitionAgent.updateMany({
        where: { competitionId, agentId: batchResult.pointWinnerId },
        data: {
          score:    { increment: 1 },
          momentum: gameState.momentum[batchResult.pointWinnerId] ?? 50,
        },
      });

      // Record the winning shot as a Trade / GameEvent
      const lastFrame = batchResult.frames[batchResult.frames.length - 1];
      if (lastFrame) {
        await prisma.trade.create({
          data: {
            competitionId,
            agentId:      batchResult.pointWinnerId,
            type:         lastFrame.action,
            pair:         lastFrame.description.slice(0, 200),
            amount:       '1',
            amountUsd:    0,
            priceImpact:  '0',
            rationale:    `${batchResult.totalShots}-shot rally`,
            successRate:  0,
            pointValue:   1,
          },
        });
      }
    }

    // Settle if match is over
    if (batchResult.matchOver) {
      await settleCompetition(competitionId);
    }

    const lastDesc = batchResult.frames[batchResult.frames.length - 1]?.description ?? '';
    console.log(`[sport-tick] ${competitionId} | rally ${gameState.rallyCount} | ${batchResult.totalShots} shots | ${lastDesc.slice(0, 60)}`);

    // Return batch result — client can animate the full sequence
    return [{ sport: true, batchRally: batchResult, result: batchResult.frames[batchResult.frames.length - 1] }];
  } catch (err) {
    console.error(`[sport-tick] Error in ${competitionId}:`, err);
    return [];
  } finally {
    await prisma.competition.update({
      where: { id: competitionId },
      data: { isTicking: false },
    }).catch(() => {});
  }
}
