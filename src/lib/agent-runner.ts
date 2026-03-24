import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { Agent } from '@prisma/client';
import { type MarketContext } from './market-data';
import { getSwapQuote, executeSwap } from './okx-swap';

export const TradeDecisionSchema = z.object({
  action:            z.enum(['BUY', 'SELL', 'HOLD']),
  token:             z.string().describe('Symbol to trade: OKB, WETH, WBTC, USDC. Empty if HOLD.'),
  amountPercentage:  z.number().min(0).max(100).describe('% of portfolio/token position to trade (0-100)'),
  rationale:         z.string().describe('One-sentence reason based on market data and agent strategy.'),
});

export type TradeDecision = z.infer<typeof TradeDecisionSchema>;

// ── AI decision via GPT-4o-mini ────────────────────────────────────────────────
export async function executeAgentTurn(
  agent:            Agent,
  portfolioBalance: number,
  market:           MarketContext
): Promise<TradeDecision> {

  const prompt = `
You are an autonomous AI trading agent competing in a live trading arena on X Layer (chain 196).

Your Name: ${agent.name}
Your Archetype: ${agent.archetype}
Your Strategy: ${agent.strategy}
Your Risk Tolerance: ${agent.risk}
Your Traits: ${agent.traits}
Current Portfolio NAV: $${portfolioBalance.toFixed(2)} USDC

LIVE MARKET (OKX real-time):
Overall Sentiment: ${market.overallSentiment}
Tokens:
${market.tokens.map(t =>
  `- ${t.symbol}: $${t.price.toFixed(4)} (24h: ${t.change24h > 0 ? '+' : ''}${t.change24h.toFixed(2)}%, Vol: ${t.volume24h}, Trend: ${t.trend})`
).join('\n')}

RECENT WHALE MOVEMENTS:
${market.whaleMovements.map(w => `- ${w.action} ${w.amount} of ${w.token} (${w.timestamp})`).join('\n')}

Available tokens: OKB, WETH, WBTC (buy with USDC), or USDC (sell tokens into).

Based EXACTLY on your strategy and risk tolerance, decide your next trade.
`;

  if (!process.env.OPENAI_API_KEY) {
    console.warn('[agent] No OPENAI_API_KEY — using mock decision');
    return generateMockDecision(agent, market);
  }

  try {
    const { object } = await generateObject({
      model:  openai('gpt-4o-mini'),
      schema: TradeDecisionSchema,
      prompt,
    });
    return object;
  } catch (error) {
    console.error(`[agent] LLM failed for ${agent.name}:`, error);
    return generateMockDecision(agent, market);
  }
}

// ── Real on-chain execution ────────────────────────────────────────────────────
// Called from orchestrator when agent has a walletKey (real mode)
export interface RealTradeResult {
  action:      string;
  token:       string;
  fromToken:   string;
  toToken:     string;
  amountUsd:   number;
  toAmount:    number;
  priceImpact: number;
  txHash?:     string;
  rationale:   string;
  dryRun:      boolean;
  error?:      string;
}

export async function executeRealTrade(
  agent:      Agent,
  decision:   TradeDecision,
  portfolioBalance: number,
  dryRun = false
): Promise<RealTradeResult | null> {
  if (decision.action === 'HOLD') return null;

  const walletKey = (agent as any).walletKey as string | null;
  if (!walletKey) return null; // fall back to simulation

  const amountUsd  = (portfolioBalance * decision.amountPercentage) / 100;
  const fromToken  = decision.action === 'BUY'  ? 'USDC' : decision.token;
  const toToken    = decision.action === 'BUY'  ? decision.token : 'USDC';

  if (amountUsd < 0.01) return null; // too small to execute

  const result = await executeSwap(fromToken, toToken, amountUsd, walletKey, dryRun);

  return {
    action:      decision.action,
    token:       decision.token,
    fromToken,
    toToken,
    amountUsd,
    toAmount:    result.toAmount,
    priceImpact: result.priceImpact,
    txHash:      result.txHash,
    rationale:   decision.rationale,
    dryRun:      !!result.dryRun,
    error:       result.error,
  };
}

// ── Mock fallback ──────────────────────────────────────────────────────────────
function generateMockDecision(agent: Agent, market: MarketContext): TradeDecision {
  const isAggressive = agent.risk === 'Aggressive';
  const isModerate   = agent.risk === 'Moderate';
  const holdChance   = isAggressive ? 0.20 : isModerate ? 0.35 : 0.50;

  let action: 'BUY' | 'SELL' | 'HOLD';
  if (Math.random() < holdChance) {
    action = 'HOLD';
  } else {
    const buyBias = market.overallSentiment === 'bullish' ? 0.7
                  : market.overallSentiment === 'bearish' ? 0.3 : 0.55;
    action = Math.random() < buyBias ? 'BUY' : 'SELL';
  }

  const tokensToPick = market.tokens.filter(t => t.symbol !== 'USDC');
  const sorted = [...tokensToPick].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
  const token  = sorted[Math.floor(Math.random() * Math.min(2, sorted.length))].symbol;
  const maxPct = isAggressive ? 40 : isModerate ? 25 : 15;

  return {
    action,
    token: action === 'HOLD' ? '' : token,
    amountPercentage: Math.floor(Math.random() * maxPct) + 5,
    rationale: action === 'HOLD'
      ? `Holding — ${market.overallSentiment} sentiment, no clear edge for ${agent.risk.toLowerCase()} profile.`
      : `${action} ${token}: ${market.overallSentiment} market, ${token} trend is ${market.tokens.find(t => t.symbol === token)?.trend ?? 'flat'}. ${agent.risk} risk.`,
  };
}
