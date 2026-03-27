/**
 * Async LLM Tactical Advisor — adjusts trainer strategy between rallies.
 *
 * Runs every 3 rallies as fire-and-forget (non-blocking).
 * Reads the current match state, sends a fast LLM call to suggest
 * one tactical adjustment, then persists the updated strategy to the DB.
 *
 * Latency: 200-500ms (Groq). Does NOT block the current tick.
 * The updated strategy is picked up by the next tick (4s away).
 */

import { prisma } from './db';
import type { GameState, TrainerStrategy } from './game-engine';

const GROQ_KEY = process.env.GROQ_API_KEY ?? '';
const GOOGLE_KEY = process.env.GOOGLE_AI_API_KEY ?? '';

/**
 * Fire-and-forget: adjust each agent's strategy based on current match state.
 * Called from orchestrator every 3 rallies.
 */
export async function adjustStrategyAsync(
  competitionId: string,
  gameState: GameState,
  agentMap: Record<string, { agent: any }>,
): Promise<void> {
  const strategies = (gameState as any).strategies as Record<string, TrainerStrategy> | undefined;
  if (!strategies) return;

  const agentIds = Object.keys(strategies);
  if (agentIds.length === 0) return;

  const updates: Record<string, TrainerStrategy> = { ...strategies };
  let changed = false;

  for (const agentId of agentIds) {
    const strat = strategies[agentId];
    if (!strat) continue;

    const agentName = agentMap[agentId]?.agent?.name ?? 'Agent';
    const opponentId = Object.keys(gameState.agentPositions).find(id => id !== agentId) ?? '';
    const opponentName = agentMap[opponentId]?.agent?.name ?? 'Opponent';

    // Build score context
    const currentSet = gameState.sets[gameState.currentSet];
    const myScore = currentSet?.agentScores[agentId] ?? 0;
    const oppScore = currentSet?.agentScores[opponentId] ?? 0;
    const momentum = gameState.momentum[agentId] ?? 50;
    const fatigue = (gameState.fatigue as Record<string, number>)?.[agentId] ?? 0;

    const prompt = `You are a badminton coach mid-match.
Agent: ${agentName}. Score: ${myScore}-${oppScore} vs ${opponentName}. Set ${gameState.currentSet + 1}.
Momentum: ${momentum.toFixed(0)}/100. Fatigue: ${fatigue.toFixed(0)}/100.
Current strategy: ${strat.gameplan}, shot bias: smash=${strat.shotBias?.smash ?? 'auto'} drop=${strat.shotBias?.drop ?? 'auto'}.
${strat.customInstructions ? `Trainer notes: "${strat.customInstructions}"` : ''}

Based on the match state, suggest ONE tactical adjustment.
Reply ONLY with JSON: {"shotBias":{"smash":0.3,"drop":0.4,"drive":0.2,"clear":0.1},"rationale":"one sentence"}`;

    try {
      const adjustment = await callLlmFast(prompt);
      if (adjustment?.shotBias) {
        updates[agentId] = {
          ...strat,
          shotBias: {
            smash: clamp01(adjustment.shotBias.smash ?? strat.shotBias?.smash),
            drop:  clamp01(adjustment.shotBias.drop  ?? strat.shotBias?.drop),
            drive: clamp01(adjustment.shotBias.drive ?? strat.shotBias?.drive),
            clear: clamp01(adjustment.shotBias.clear ?? strat.shotBias?.clear),
          },
        };
        changed = true;
        console.log(`[strategy-advisor] ${agentName}: ${adjustment.rationale ?? 'adjusted'}`);
      }
    } catch (err: any) {
      console.debug(`[strategy-advisor] LLM failed for ${agentName}: ${err.message?.slice(0, 60)}`);
    }
  }

  if (!changed) return;

  // Persist updated strategies to DB
  try {
    const comp = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: { gameState: true },
    });
    if (!comp?.gameState) return;

    const gs = JSON.parse(comp.gameState as string);
    gs.strategies = updates;

    await prisma.competition.update({
      where: { id: competitionId },
      data: { gameState: JSON.stringify(gs) },
    });
  } catch (err: any) {
    console.warn('[strategy-advisor] DB persist failed:', err.message?.slice(0, 60));
  }
}

/** Fast LLM call with 1.5s timeout. Tries Groq, then Gemini Flash. */
async function callLlmFast(prompt: string): Promise<any | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    // Try Groq first (fastest)
    if (GROQ_KEY) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Reply ONLY with valid JSON. No markdown, no explanation.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.5,
          max_tokens: 80,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
      }
    }

    // Fallback: Gemini Flash
    if (GOOGLE_KEY) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Reply ONLY with valid JSON.\n\n${prompt}` }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 80, responseMimeType: 'application/json' },
          }),
          signal: controller.signal,
        }
      );
      if (res.ok) {
        const data = await res.json();
        return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}');
      }
    }

    return null;
  } catch {
    return null; // timeout or network error — no harm
  } finally {
    clearTimeout(timeout);
  }
}

function clamp01(v: number | undefined): number | undefined {
  if (v === undefined) return undefined;
  return Math.max(0, Math.min(1, v));
}
