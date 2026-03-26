/**
 * Sport Agent Runner — AI decision making for sports matches
 * Replaces executeAgentTurn for competition.type === "sport"
 */

import { z } from 'zod';
import type { Agent } from '@prisma/client';
import type { GameState, SportAction, ShotDecision } from './game-engine';

// ── Schema ─────────────────────────────────────────────────────────────────────
export const ShotDecisionSchema = z.object({
  action: z.enum(['SERVE', 'SMASH', 'DROP', 'CLEAR', 'DRIVE', 'LOB', 'BLOCK', 'SPECIAL']),
  targetZone: z.number().min(1).max(9).describe(
    'Target zone 1–9 (1=back-left, 2=back-center, 3=back-right, 4=mid-left, 5=center, 6=mid-right, 7=front-left, 8=front-center, 9=front-right)'
  ),
  specialMove: z.string().nullable().describe('Name of special move if action is SPECIAL, otherwise null'),
  rationale: z.string().describe('One-sentence tactical reasoning.'),
});

// Extended agent type with sport stats
export type SportAgent = Agent & {
  speed:        number;
  power:        number;
  stamina:      number;
  accuracy:     number;
  specialMoves: string; // JSON string array
};

// ── Main decision function ─────────────────────────────────────────────────────
export async function executeSportAgentTurn(
  agent: SportAgent,
  gameState: GameState,
  opponentId: string,
  opponentName: string
): Promise<ShotDecision> {
  const myScore      = gameState.sets[gameState.currentSet]?.agentScores[agent.id] ?? 0;
  const oppScore     = gameState.sets[gameState.currentSet]?.agentScores[opponentId] ?? 0;
  const myMomentum   = gameState.momentum[agent.id] ?? 50;
  const shuttlePos   = gameState.shuttlePosition;
  const myPos        = gameState.agentPositions[agent.id];
  const trainerCmd   = gameState.trainerCommands[agent.id];

  let specialMovesArr: string[] = [];
  try { specialMovesArr = JSON.parse(agent.specialMoves || '[]'); } catch {}

  const prompt = `You are an AI ${gameState.sport} agent competing in a live match.

Your Name: ${agent.name}
Your Play Style: ${agent.strategy || 'Balanced all-rounder'}
Your Stats: Speed ${agent.speed}/10, Power ${agent.power}/10, Accuracy ${agent.accuracy}/10, Stamina ${agent.stamina}/10
Your Special Moves: ${specialMovesArr.join(', ') || 'None'}
Current Momentum: ${myMomentum.toFixed(0)}/100 ${myMomentum > 65 ? '(HOT streak! 🔥)' : myMomentum < 35 ? '(Cold — need a winner)' : ''}

MATCH STATE:
Sport: ${gameState.sport}
Score: You ${myScore} – ${oppScore} ${opponentName}
Set: ${gameState.currentSet + 1} | Current rally length: ${gameState.rallyLength} shots
Last action in rally: ${gameState.lastAction}
Shuttle position: (${shuttlePos.x.toFixed(0)}, ${shuttlePos.y.toFixed(0)}) — ${shuttlePos.y < 30 ? 'near the net' : shuttlePos.y > 70 ? 'deep back court' : 'mid court'}
Your position: (${myPos?.x?.toFixed(0) ?? 50}, ${myPos?.y?.toFixed(0) ?? 50})
${trainerCmd ? `\n🎯 TRAINER COMMAND: "${trainerCmd}" — FOLLOW THIS INSTRUCTION NOW!\n` : ''}

You are the ${gameState.servingAgentId === agent.id ? 'SERVING' : 'RECEIVING'} player for this rally.

Tactical guidelines:
- SMASH is high-risk/high-reward: only effective when shuttle y > 50 (above net level)
- DROP near net wins points but requires high accuracy
- CLEAR resets the rally safely to back court
- SPECIAL costs 20 momentum — use only when momentum > 60
- Choose shot based on your play style, current momentum, and score situation`;

  const groqKey  = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    console.warn('[sport-agent] No LLM key — using mock decision');
    return generateMockShotDecision(agent, gameState, specialMovesArr);
  }

  // ── Groq (800 tok/s — preferred for real-time sport) ────────────────────────
  if (groqKey) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Groq = require('groq-sdk').default ?? require('groq-sdk');
      const groq = new Groq({ apiKey: groqKey });
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a ${gameState.sport} AI agent making shot decisions. Respond ONLY with valid JSON: { "action": "SMASH"|"DROP"|"CLEAR"|"DRIVE"|"LOB"|"BLOCK"|"SERVE"|"SPECIAL", "targetZone": 1-9, "specialMove": null, "rationale": "one sentence" }`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 120,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      const validActions = ['SERVE','SMASH','DROP','CLEAR','DRIVE','LOB','BLOCK','SPECIAL'];
      if (validActions.includes(parsed.action)) {
        return {
          action:      parsed.action as SportAction,
          targetZone:  Math.max(1, Math.min(9, Number(parsed.targetZone) || 5)),
          specialMove: parsed.specialMove ?? null,
          rationale:   parsed.rationale ?? 'Tactical decision.',
        };
      }
    } catch (err: any) {
      console.warn(`[sport-agent] Groq failed for ${agent.name}: ${err.message?.slice(0, 60)} — trying OpenAI`);
    }
  }

  // ── OpenAI fallback ──────────────────────────────────────────────────────────
  if (openaiKey) {
    try {
      const { generateObject } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');
      const { object } = await generateObject({
        model:  openai('gpt-4o-mini'),
        schema: ShotDecisionSchema,
        prompt,
      });
      return object;
    } catch (err: any) {
      console.warn(`[sport-agent] OpenAI fallback failed for ${agent.name}: ${err.message?.slice(0, 60)}`);
    }
  }

  return generateMockShotDecision(agent, gameState, specialMovesArr);
}

// ── Mock fallback (no API key or LLM failure) ──────────────────────────────────
function generateMockShotDecision(
  agent: SportAgent,
  gameState: GameState,
  specialMoves: string[]
): ShotDecision {
  const momentum     = gameState.momentum[agent.id] ?? 50;
  const shuttleY     = gameState.shuttlePosition.y;
  const rallyLen     = gameState.rallyLength;
  const isAggressive = agent.risk === 'Aggressive';
  const isDefensive  = agent.risk === 'Defensive' || agent.risk === 'Conservative';

  // Special move on hot streak
  if (momentum > 78 && specialMoves.length > 0 && Math.random() < 0.25) {
    return {
      action:      'SPECIAL',
      targetZone:  Math.floor(Math.random() * 9) + 1,
      specialMove: specialMoves[Math.floor(Math.random() * specialMoves.length)],
      rationale:   `Unleashing special move — momentum at ${momentum.toFixed(0)}, closing this rally!`,
    };
  }

  // Weighted action pool based on game situation
  const pool: SportAction[] = [];
  if (shuttleY > 65 && !isDefensive) pool.push('SMASH', 'SMASH', 'DRIVE');
  if (shuttleY < 30)                   pool.push('DROP', 'BLOCK', 'DRIVE');
  if (rallyLen > 10)                   pool.push('CLEAR', 'LOB', 'CLEAR');
  if (momentum < 35)                   pool.push('CLEAR', 'LOB', 'BLOCK');
  if (isAggressive)                    pool.push('SMASH', 'DRIVE', 'DROP');
  if (isDefensive)                     pool.push('CLEAR', 'LOB', 'BLOCK', 'DROP');
  // Always ensure all actions are reachable
  pool.push('SMASH', 'DROP', 'CLEAR', 'DRIVE', 'LOB', 'BLOCK');

  const action     = pool[Math.floor(Math.random() * pool.length)];
  const targetZone = Math.floor(Math.random() * 9) + 1;

  const rationales: Record<string, string> = {
    SMASH:  `Shuttle is high — smashing to zone ${targetZone} for a winner.`,
    DROP:   `Precise drop to zone ${targetZone} — catching them off guard.`,
    CLEAR:  `Clearing deep to reset, buying time to reposition.`,
    DRIVE:  `Flat drive to zone ${targetZone} — fast and flat.`,
    LOB:    `Lobbing high to push opponent deep into the back court.`,
    BLOCK:  `Tight defensive block — neutralizing the attack.`,
    SERVE:  `Serving into zone ${targetZone}.`,
  };

  return {
    action,
    targetZone,
    rationale: rationales[action] ?? 'Tactical decision.',
  };
}
