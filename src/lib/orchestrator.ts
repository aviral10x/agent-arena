import { prisma } from './db';
import { getMarketContext } from './market-data';
import { executeAgentTurn, executeRealTrade } from './agent-runner';
import { getDexRoute } from './okx-os';
import { getSwapQuote } from './okx-swap';
import { onCompetitionSettle } from './stats';
import { settleBets } from './betting';

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
        const fromToken   = decision.action === 'BUY' ? 'USDC' : decision.token;
        const toToken     = decision.action === 'BUY' ? decision.token : 'USDC';
        const pair        = `${fromToken} → ${toToken}`;
        const amountStr   = `${amountValue.toFixed(2)} ${fromToken}`;
        const hasWallet   = !!(ca.agent as any).walletKey;

        let priceImpactNum  = 0;
        let priceImpactStr  = '+0.00%';
        let pnlChange       = 0;
        let txHash: string | undefined;

        if (hasWallet) {
          // ── REAL MODE: actual on-chain swap ──────────────────────────────
          const realResult = await executeRealTrade(ca.agent, decision, ca.portfolio);
          if (realResult && !realResult.error) {
            priceImpactNum = realResult.priceImpact;
            priceImpactStr = `${priceImpactNum > 0 ? '-' : '+'}${Math.abs(priceImpactNum * 100).toFixed(2)}%`;
            txHash         = realResult.txHash;
            // PnL from actual price movement: output value - input value
            const tokenPrice = market.tokens.find(t => t.symbol === decision.token)?.price ?? 1;
            const outputUsd  = decision.action === 'BUY'
              ? realResult.toAmount * tokenPrice
              : realResult.toAmount; // USDC out
            pnlChange = outputUsd - amountValue;
            console.log(`[real] ${ca.agent.name} ${decision.action} ${decision.token} tx=${txHash} pnl=$${pnlChange.toFixed(4)}`);
          } else {
            console.warn(`[real] ${ca.agent.name} swap failed: ${realResult?.error} — falling back to simulation`);
          }
        }

        if (!hasWallet || pnlChange === 0) {
          // ── SIMULATED MODE: quote-based PnL ──────────────────────────────
          const route      = await getDexRoute(fromToken, toToken, amountValue.toString());
          priceImpactNum   = Number(route.priceImpact) || 0;
          priceImpactStr   = `${priceImpactNum > 0 ? '-' : '+'}${Math.abs(priceImpactNum * 100).toFixed(2)}%`;
          const marketMove = (market.tokens.find(t => t.symbol === decision.token)?.change24h || 0) / 100;
          const slippage   = amountValue * Math.abs(priceImpactNum);
          const edge       = decision.action === 'BUY' ? amountValue * marketMove : amountValue * -marketMove;
          const luck       = (Math.random() - 0.45) * amountValue * 0.05;
          pnlChange        = edge - slippage + luck;
        }

        const newPortfolio = Math.max(0, ca.portfolio + pnlChange);
        const newPnl       = ca.pnl + pnlChange;
        const newPnlPct    = ((newPortfolio - ca.startingPortfolio) / ca.startingPortfolio) * 100;
        const newScore     = Math.max(0, Math.floor(ca.score + pnlChange * 10));

        await prisma.$transaction([
          prisma.trade.create({
            data: {
              competitionId,
              agentId:     ca.agentId,
              type:        decision.action,
              pair,
              amount:      amountStr,
              amountUsd:   amountValue,
              rationale:   decision.rationale,
              priceImpact: priceImpactStr,
            }
          }),
          prisma.competitionAgent.update({
            where: { id: ca.id },
            data:  { portfolio: newPortfolio, pnl: newPnl, pnlPct: newPnlPct, score: newScore, trades: ca.trades + 1 }
          }),
          prisma.competition.update({
            where: { id: competitionId },
            data:  { volumeUsd: { increment: amountValue } }
          })
        ]);

        await prisma.signal.create({
          data: {
            agentId:       ca.agentId,
            competitionId,
            tradeType:     decision.action,
            pair,
            rationale:     decision.rationale,
            priceAtSignal: market.tokens.find(t => t.symbol === decision.token)?.price ?? 0,
            priceUsd:      0.01,
          },
        }).catch(() => {});

        results.push({ agent: ca.agent.name, action: decision.action, token: decision.token, pnlChange, txHash, realMode: hasWallet });
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
