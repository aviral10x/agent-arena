import { prisma } from './db';
import { getMarketContext } from './market-data';
import { executeAgentTurn } from './agent-runner';
import { getDexRoute } from './okx-os';

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

export async function runCompetitionTick(competitionId: string) {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      agents: { include: { agent: true } }
    }
  });

  if (!competition) throw new Error('Competition not found');
  if (competition.status !== 'live') throw new Error('Competition is not live');

  // FIX 2.2: prevent concurrent ticks — bail if already running
  if (competition.isTicking) {
    console.log(`[tick] ${competitionId} already ticking, skipping`);
    return [];
  }

  // FIX 3.1: auto-settle if duration has elapsed
  if (competition.startedAt) {
    const elapsedSeconds = (Date.now() - competition.startedAt.getTime()) / 1000;
    if (elapsedSeconds >= competition.durationSeconds) {
      await settleCompetition(competitionId);
      return [{ settled: true }];
    }
  }

  // Acquire tick lock
  await prisma.competition.update({
    where: { id: competitionId },
    data: { isTicking: true }
  });

  try {
    const market = await getMarketContext();
    const results = [];

    for (const ca of competition.agents) {
      const decision = await executeAgentTurn(ca.agent, ca.portfolio, market);

      if (decision.action !== 'HOLD') {
        const amountValue = (ca.portfolio * decision.amountPercentage) / 100;
        const amountStr = `${amountValue.toFixed(2)} ${decision.action === 'BUY' ? 'USDC' : decision.token}`;
        const pair = decision.action === 'BUY'
          ? `USDC → ${decision.token}`
          : `${decision.token} → USDC`;

        const fromToken = decision.action === 'BUY' ? 'USDC' : decision.token;
        const toToken   = decision.action === 'BUY' ? decision.token : 'USDC';
        const route = await getDexRoute(fromToken, toToken, amountValue.toString());

        const priceImpactNum  = Number(route.priceImpact) || 0;
        const priceImpactStr  = `${priceImpactNum > 0 ? '-' : '+'}${Math.abs(priceImpactNum * 100).toFixed(2)}%`;
        const marketMove      = (market.tokens.find(t => t.symbol === decision.token)?.change24h || 0) / 100;
        const slippageCost    = amountValue * Math.abs(priceImpactNum);
        const executionEdge   = decision.action === 'BUY'
          ? amountValue * marketMove
          : amountValue * -marketMove;
        const luck            = (Math.random() - 0.45) * amountValue * 0.05;
        const pnlChange       = executionEdge - slippageCost + luck;

        const newPortfolio    = Math.max(0, ca.portfolio + pnlChange);
        // FIX 1.1: pnl in $ absolute, pnlPct relative to startingPortfolio
        const newPnl          = ca.pnl + pnlChange;
        const newPnlPct       = ((newPortfolio - ca.startingPortfolio) / ca.startingPortfolio) * 100;
        // FIX 1.4: score unbounded integer, display uses dynamic max
        const newScore        = Math.max(0, Math.floor(ca.score + pnlChange * 10));

        await prisma.$transaction([
          prisma.trade.create({
            data: {
              competitionId,
              agentId:      ca.agentId,
              type:         decision.action,
              pair,
              amount:       amountStr,
              amountUsd:    amountValue,       // FIX 1.2: raw USD
              rationale:    decision.rationale,
              priceImpact:  priceImpactStr,
              // timestamp defaults to now() — FIX 1.3 source of truth
            }
          }),
          prisma.competitionAgent.update({
            where: { id: ca.id },
            data: {
              portfolio: newPortfolio,
              pnl:       newPnl,
              pnlPct:    newPnlPct,            // FIX 1.1
              score:     newScore,
              trades:    ca.trades + 1,
            }
          }),
          // FIX 1.2: accumulate raw USD, format on display
          prisma.competition.update({
            where: { id: competitionId },
            data: { volumeUsd: { increment: amountValue } }
          })
        ]);

        results.push({ agent: ca.agent.name, action: decision.action, token: decision.token, pnlChange });
      } else {
        results.push({ agent: ca.agent.name, action: 'HOLD' });
      }
    }

    return results;
  } finally {
    // Always release tick lock
    await prisma.competition.update({
      where: { id: competitionId },
      data: { isTicking: false }
    });
  }
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
      status:   'settled',
      winnerId: winner?.agentId ?? null,
      isTicking: false,
    }
  });

  console.log(`[settle] Competition ${competitionId} settled. Winner: ${winner?.agent?.name}`);
}
