import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { Agent } from '@prisma/client';
import { type MarketContext } from './market-data';

export const TradeDecisionSchema = z.object({
  action: z.enum(['BUY', 'SELL', 'HOLD']),
  token: z.string().describe('The symbol of the token to trade (e.g., OKB, WETH, MEME_COIN). If HOLD, can be empty.'),
  amountPercentage: z.number().min(0).max(100).describe('Percentage of available portfolio/token to trade (0-100)'),
  rationale: z.string().describe('A short 1-sentence explanation of why this decision was made based on the market data and agent strategy.'),
});

export type TradeDecision = z.infer<typeof TradeDecisionSchema>;

export async function executeAgentTurn(
  agent: Agent,
  portfolioBalance: number,
  market: MarketContext
): Promise<TradeDecision> {
  const prompt = `
You are an autonomous AI trading agent operating in a simulated arena on X Layer.
Your Name: ${agent.name}
Your Archetype: ${agent.archetype}
Your Strategy: ${agent.strategy}
Your Risk Tolerance: ${agent.risk}
Your Traits: ${agent.traits}

CURRENT PORTFOLIO NAV: $${portfolioBalance.toFixed(2)} USDC

CURRENT MARKET STATE:
Overall Sentiment: ${market.overallSentiment}
Tokens:
${market.tokens.map(t => `- ${t.symbol}: $${t.price.toFixed(4)} (24h: ${t.change24h > 0 ? '+' : ''}${t.change24h.toFixed(2)}%, Volume: ${t.volume24h}, Trend: ${t.trend})`).join('\n')}

RECENT WHALE MOVEMENTS:
${market.whaleMovements.map(w => `- ${w.action} ${w.amount} of ${w.token} (${w.timestamp})`).join('\n')}

Based EXACTLY on your assigned strategy and risk tolerance, decide what your next trading action is. 
Output your decision as a JSON object matching the requested schema.
`;

  // Fallback if no API key is provided for easy local demo
  if (!process.env.OPENAI_API_KEY) {
    console.warn("No OPENAI_API_KEY found. Using mock agent decision.");
    return generateMockDecision(agent, market);
  }

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: TradeDecisionSchema,
      prompt,
    });
    
    return object;
  } catch (error) {
    console.error(`LLM execution failed for agent ${agent.id}:`, error);
    return generateMockDecision(agent, market);
  }
}

function generateMockDecision(agent: Agent, market: MarketContext): TradeDecision {
  const isAggressive = agent.risk === "Aggressive";
  const overrideAction = Math.random() > (isAggressive ? 0.2 : 0.5) ? 'BUY' : 'HOLD';
  const actions = [overrideAction, 'SELL', 'HOLD'] as const;
  const action = actions[Math.floor(Math.random() * actions.length)];
  const tokensToPick = market.tokens.filter(t => t.symbol !== 'USDC');
  const token = tokensToPick[Math.floor(Math.random() * tokensToPick.length)].symbol;
  
  return {
    action,
    token: action === 'HOLD' ? '' : token,
    amountPercentage: Math.floor(Math.random() * (isAggressive ? 50 : 20)) + 5,
    rationale: `Simulated ${action} decision based on ${agent.risk} risk profile given the ${market.overallSentiment} market sentiment.`,
  };
}
