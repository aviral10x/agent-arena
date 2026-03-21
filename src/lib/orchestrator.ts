import { prisma } from './db';
import { getMarketContext } from './market-data';
import { executeAgentTurn } from './agent-runner';

export async function runCompetitionTick(competitionId: string) {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      agents: {
        include: { agent: true }
      }
    }
  });

  if (!competition) throw new Error("Competition not found");
  if (competition.status !== "live") throw new Error("Competition is not live");

  const market = await getMarketContext();
  const results = [];

  for (const ca of competition.agents) {
    const decision = await executeAgentTurn(ca.agent, ca.portfolio, market);
    
    if (decision.action !== 'HOLD') {
      const amountValue = (ca.portfolio * decision.amountPercentage) / 100;
      const amountStr = `${amountValue.toFixed(2)} ${decision.action === 'BUY' ? 'USDC' : decision.token}`;
      const pair = decision.action === 'BUY' ? `USDC -> ${decision.token}` : `${decision.token} -> USDC`;
      const priceImpact = `${decision.action === 'BUY' ? '+' : '-'}${(Math.random() * 0.5).toFixed(2)}%`;

      // Simulate a trade result (profit or loss based on archetype and luck)
      const luck = Math.random() - 0.45; // slightly positive bias
      const pnlChange = luck * (ca.portfolio * decision.amountPercentage / 100); 
      const newPortfolio = Math.max(0, ca.portfolio + pnlChange);
      const newPnl = ca.pnl + pnlChange;
      const newScore = Math.max(0, Math.floor(ca.score + pnlChange * 10));

      await prisma.$transaction([
        prisma.trade.create({
          data: {
            competitionId,
            agentId: ca.agentId,
            type: decision.action,
            pair,
            amount: amountStr,
            rationale: decision.rationale,
            priceImpact,
            time: "Just now",
          }
        }),
        prisma.competitionAgent.update({
          where: { id: ca.id },
          data: {
            portfolio: newPortfolio,
            pnl: newPnl,
            score: newScore,
            trades: ca.trades + 1,
          }
        }),
        // Also increment competition volume
        prisma.competition.update({
          where: { id: competitionId },
          data: {
            volume: `$${(parseFloat(competition.volume.replace(/[^0-9.]/g, '') || "0") + amountValue).toFixed(1)}k`
          }
        })
      ]);

      results.push({ agent: ca.agent.name, action: decision.action, token: decision.token, pnlChange });
    } else {
      results.push({ agent: ca.agent.name, action: 'HOLD' });
    }
  }

  return results;
}
