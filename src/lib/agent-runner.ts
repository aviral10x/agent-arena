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
  const isAggressive = agent.risk === 'Aggressive';
  const isModerate   = agent.risk === 'Moderate';

  // Hold probability: 20% aggressive, 35% moderate, 50% conservative
  const holdChance = isAggressive ? 0.20 : isModerate ? 0.35 : 0.50;
  const rand = Math.random();

  let action: 'BUY' | 'SELL' | 'HOLD';
  if (rand < holdChance) {
    action = 'HOLD';
  } else {
    // Lean BUY in bullish, SELL in bearish, mixed in neutral
    const buyBias = market.overallSentiment === 'bullish' ? 0.7
                  : market.overallSentiment === 'bearish' ? 0.3
                  : 0.55;
    action = Math.random() < buyBias ? 'BUY' : 'SELL';
  }

  const tokensToPick = market.tokens.filter(t => t.symbol !== 'USDC');
  // Prefer tokens with the strongest move
  const sorted = [...tokensToPick].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
  const token = sorted[Math.floor(Math.random() * Math.min(2, sorted.length))].symbol;

  const maxPct = isAggressive ? 40 : isModerate ? 25 : 15;

  return {
    action,
    token: action === 'HOLD' ? '' : token,
    amountPercentage: Math.floor(Math.random() * maxPct) + 5,
    rationale: action === 'HOLD'
      ? `Holding position — ${market.overallSentiment} sentiment with no clear edge for ${agent.risk.toLowerCase()} profile.`
      : `${action} ${token} — ${market.overallSentiment} market, ${token} showing ${market.tokens.find(t=>t.symbol===token)?.trend ?? 'flat'} trend. ${agent.risk} risk profile.`,
  };
}
