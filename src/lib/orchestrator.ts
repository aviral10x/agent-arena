import { prisma } from './db';
import { onCompetitionSettle } from './stats';
import { settleBets } from './betting';
import { initGameState, resolveRally, resolveFullRally, type GameState, type ShotDecision, type BatchRallyResult } from './game-engine';
import { executeSportAgentTurn, generateMockDecision, type SportAgent } from './sport-agent-runner';
import { signAgentPayment } from './agent-wallet';
import { adjustStrategyAsync } from './strategy-advisor';

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

  // Winner = highest score (sport) or portfolio (trading)
  const isSport = (competition as any).type === 'sport';
  const winner = competition.agents.reduce(
    (best, ca) => {
      const metric = isSport ? (ca.score ?? 0) : ca.portfolio;
      const bestMetric = isSport ? (best?.score ?? 0) : (best?.portfolio ?? 0);
      return metric > bestMetric ? ca : best;
    },
    competition.agents[0]
  );

  // ATOMIC: only one concurrent caller can settle — updateMany returns count=0 for losers
  const settled = await prisma.competition.updateMany({
    where: { id: competitionId, status: { not: 'settled' } },
    data: {
      status:    'settled',
      winnerId:  winner?.agentId ?? null,
      isTicking: false,
      bettingOpen: false,
    }
  });
  if (settled.count === 0) return; // another tick already settled

  const winnerName = winner?.agent?.name ?? 'Unknown';
  const winnerWallet = (winner?.agent as any)?.wallet;
  console.log(`[settle] Competition ${competitionId} settled. Winner: ${winnerName}`);

  // ═══ AGENT WALLET: Log prize credit for the winning agent ═══
  // Prize = entry fees from both agents ($0.20 total, 90% to winner = $0.18)
  const MATCH_ENTRY_FEE = 0.10;
  const PRIZE_POOL = MATCH_ENTRY_FEE * competition.agents.length;
  const PLATFORM_RAKE = 0.10; // 10%
  const WINNER_PAYOUT = PRIZE_POOL * (1 - PLATFORM_RAKE);

  if (winner?.agentId && winnerWallet && winnerWallet !== '0x0000000000000000000000000000000000000000') {
    console.log(`[agent-wallet] 🏆 ${winnerName} wins $${WINNER_PAYOUT.toFixed(2)} USDC prize → ${winnerWallet.slice(0, 10)}...`);
    // Note: actual USDC transfer would use transferUsdc() from agent-wallet.ts
    // For now, credited to DB only. Enable on-chain transfer when wallets are funded:
    // await transferUsdc(winnerWallet, WINNER_PAYOUT, `prize ${competitionId.slice(0,8)}`);
  }

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
    // Stale lock detection: if isTicking has been true for >30s, the previous tick crashed
    const tickAge = Date.now() - new Date(competition.updatedAt).getTime();
    if (tickAge < 30000) {
      console.log(`[sport-tick] ${competitionId} already ticking (${Math.round(tickAge/1000)}s), skipping`);
      return [];
    }
    console.warn(`[sport-tick] ${competitionId} stale lock detected (${Math.round(tickAge/1000)}s) — force resetting`);
    await prisma.competition.update({ where: { id: competitionId }, data: { isTicking: false } });
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

    // ═══ AGENT WALLET: Pay match entry fee on first rally ═══
    // Each agent's wallet pays $0.10 USDC via x402 when the match starts.
    // This is signed server-side via OKX agentic wallet (TEE).
    const MATCH_ENTRY_FEE = 0.10;
    if (gameState.rallyCount === 0 && gameState.rallyLength === 0) {
      for (const ca of competition.agents) {
        const agentName = ca.agent?.name ?? ca.agentId.slice(0, 8);
        try {
          const payload = await signAgentPayment(
            MATCH_ENTRY_FEE,
            `match-entry ${competitionId.slice(0, 8)} agent:${agentName}`
          );
          if (payload) {
            console.log(`[agent-wallet] ✓ ${agentName} paid $${MATCH_ENTRY_FEE} entry fee (sig: ${payload.signature.slice(0, 10)}...)`);
          } else {
            console.warn(`[agent-wallet] ⚠ ${agentName} entry fee signing failed — continuing in demo mode`);
          }
        } catch (err: any) {
          console.warn(`[agent-wallet] ⚠ ${agentName} entry fee error: ${err.message?.slice(0, 60)}`);
        }
      }
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

    // ═══ FAST DECISION ENGINE ═══
    // Real-time shots use the instant physics engine (generateMockDecision).
    // LLM is ONLY used for the opening serve of each rally (1 call, not 10+).
    // This makes rallies compute in <10ms instead of 5-20 seconds.
    const preComputed = (gameState as any).preComputedDecisions ?? {};
    let shotCount = 0;

    // Pre-fetch LLM strategy for the serving agent (1 call only, async)
    const servingEntry = agentMap[gameState.servingAgentId];
    let llmServeDecision: ShotDecision | null = null;
    if (servingEntry) {
      const opId = agentIds.find(id => id !== gameState.servingAgentId) ?? '';
      const opName = agentMap[opId]?.agent?.name ?? 'Opponent';
      // Fire LLM call for serve strategy — 500ms hard cap, instant fallback
      try {
        llmServeDecision = await Promise.race([
          executeSportAgentTurn(servingEntry.sportAgent, gameState, opId, opName),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)), // 500ms — skip if slow
        ]);
      } catch {
        llmServeDecision = null;
      }
    }

    const decisionFn = async (state: GameState, attackerId: string): Promise<ShotDecision> => {
      shotCount++;

      // Trainer pre-computed decision takes priority
      if (preComputed[attackerId]) {
        const d = preComputed[attackerId];
        delete preComputed[attackerId];
        console.log(`[sport-tick] Trainer decision for ${agentMap[attackerId]?.agent?.name}: ${d.action}`);
        return d;
      }

      const entry = agentMap[attackerId];
      if (!entry) {
        return { action: 'DRIVE', targetZone: 5, rationale: 'fallback' };
      }

      // First shot (serve): use LLM decision if available
      if (shotCount === 1 && llmServeDecision && attackerId === gameState.servingAgentId) {
        return llmServeDecision;
      }

      // All other shots: instant physics engine (0ms, no network)
      const specialMoves = (() => {
        try { return JSON.parse(entry.sportAgent.specialMoves || '[]'); }
        catch { return []; }
      })();

      // Read trainer strategy for this agent (set pre-match, adjusted by LLM advisor)
      const agentStrategy = (state as any).strategies?.[attackerId] ?? undefined;

      return generateMockDecision(
        {
          id: attackerId,
          speed: entry.sportAgent.speed,
          power: entry.sportAgent.power,
          accuracy: entry.sportAgent.accuracy,
          stamina: entry.sportAgent.stamina,
          archetype: entry.sportAgent.archetype ?? '',
        },
        state,
        specialMoves,
        agentStrategy,
      );
    };

    // ═══ BATCH RALLY: compute entire rally (serve to point) in one call ═══
    const batchResult: BatchRallyResult = await resolveFullRally(
      gameState,
      agentStats,
      decisionFn,
      30, // max shots safety cap
    );

    // Persist cleared pre-computed decisions + rally frames for HTTP polling clients
    (batchResult.finalGameState as any).preComputedDecisions = preComputed;
    (batchResult.finalGameState as any).lastBatchFrames = batchResult.frames;
    (batchResult.finalGameState as any).lastBatchTimestamp = Date.now();
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

    // ═══ ASYNC STRATEGY ADVISOR: adjust tactics every 3 rallies ═══
    // Fire-and-forget — does NOT block this tick from returning.
    // The updated strategy lands in DB before the next tick (4s away).
    if (gameState.rallyCount > 0 && gameState.rallyCount % 3 === 0 && !batchResult.matchOver) {
      adjustStrategyAsync(competitionId, gameState, agentMap).catch(err =>
        console.debug('[strategy-advisor] async error:', err.message?.slice(0, 60))
      );
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
