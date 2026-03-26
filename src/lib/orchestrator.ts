import { prisma } from './db';
import { onCompetitionSettle } from './stats';
import { settleBets } from './betting';
import { initGameState, resolveRally, type GameState } from './game-engine';
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
          ((competition as any).sport as 'badminton' | 'tennis' | 'table-tennis') ?? 'badminton',
          agentIds,
          agentIds[0]
        );

    // If already over, settle immediately
    if (gameState.matchOver) {
      await settleCompetition(competitionId);
      return [{ settled: true }];
    }

    // Get AI shot decisions for both agents
    const decisions: Record<string, any> = {};
    const preComputed = (gameState as any).preComputedDecisions ?? {};

    for (const ca of competition.agents) {
      const agent = ca.agent as any;

      // Trainer pre-computed decision takes priority — uses it once then clears
      if (preComputed[agent.id]) {
        decisions[agent.id] = preComputed[agent.id];
        delete preComputed[agent.id];
        console.log(`[sport-tick] Using trainer decision for ${agent.name}: ${decisions[agent.id].action}`);
        continue;
      }

      const sportAgent: SportAgent = {
        ...agent,
        speed:        agent.speed        ?? 7,
        power:        agent.power        ?? 7,
        stamina:      agent.stamina      ?? 7,
        accuracy:     agent.accuracy     ?? 7,
        specialMoves: agent.specialMoves ?? '[]',
      };
      const opponentCa = competition.agents.find(a => a.agentId !== agent.id);
      try {
        decisions[agent.id] = await executeSportAgentTurn(
          sportAgent,
          gameState,
          opponentCa?.agentId ?? '',
          opponentCa?.agent.name ?? 'Opponent'
        );
      } catch (err: any) {
        console.warn(`[sport-tick] LLM failed for ${agent.name}: ${err.message?.slice(0, 80)}`);
        const actions = ['SMASH', 'DROP', 'CLEAR', 'DRIVE', 'LOB'];
        decisions[agent.id] = {
          action: actions[Math.floor(Math.random() * actions.length)],
          targetZone: Math.floor(Math.random() * 9) + 1,
          specialMove: null,
          rationale: 'Tactical fallback.',
        };
      }
    }

    // Persist cleared pre-computed decisions back to game state
    (gameState as any).preComputedDecisions = preComputed;

    // Build agentStats for rally resolver
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

    // Resolve rally
    const result = resolveRally(gameState, decisions, agentStats);
    gameState = result.newGameState;

    // Persist game state + increment rally counter
    await prisma.competition.update({
      where: { id: competitionId },
      data: {
        gameState:    JSON.stringify(gameState),
        totalRallies: { increment: result.rallyLength > 0 ? 1 : 0 },
        isTicking:    false,
      },
    });

    // If a point was scored, update CompetitionAgent scores + momentum
    if (result.pointWinnerId) {
      await prisma.competitionAgent.updateMany({
        where: { competitionId, agentId: result.pointWinnerId },
        data: {
          score:    { increment: 1 },
          momentum: result.newGameState.momentum[result.pointWinnerId] ?? 50,
        },
      });

      // Record as a Trade / GameEvent
      const winnerCa = competition.agents.find(ca => ca.agentId === result.pointWinnerId);
      if (winnerCa) {
        const winnerDecision = decisions[result.pointWinnerId];
        await prisma.trade.create({
          data: {
            competitionId,
            agentId:      result.pointWinnerId,
            type:         result.action,
            pair:         result.description.slice(0, 200),
            amount:       '1',
            amountUsd:    0,
            priceImpact:  result.successRate.toString(),
            rationale:    winnerDecision?.rationale ?? '',
            successRate:  result.successRate,
            pointValue:   1,
          },
        });
      }
    }

    // Settle if match is over
    if (result.matchOver) {
      await settleCompetition(competitionId);
    }

    console.log(`[sport-tick] ${competitionId} | rally ${gameState.rallyCount} | ${result.description.slice(0, 80)}`);
    return [{ sport: true, result }];
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
