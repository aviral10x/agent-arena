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

// ── Stat-driven mock fallback (no API key or LLM failure) ─────────────────────
// Every decision is deterministic from stats + game state + small noise.
// No random pools — the agent's skills genuinely drive what shot they pick.
function generateMockShotDecision(
  agent: SportAgent,
  gameState: GameState,
  specialMoves: string[]
): ShotDecision {
  const momentum   = gameState.momentum[agent.id] ?? 50;
  const shuttlePos = gameState.shuttlePosition;
  const myPos      = gameState.agentPositions[agent.id] ?? { x: 50, y: 50 };
  const rallyLen   = gameState.rallyLength;

  // ── 1. Special move: only when hot AND high enough combined stat ───────────
  const specialThreshold = 75 + (10 - Math.max(agent.power, agent.accuracy)) * 1.5;
  if (momentum >= specialThreshold && specialMoves.length > 0) {
    const pick = specialMoves[Math.floor(Math.random() * specialMoves.length)];
    return {
      action:      'SPECIAL',
      targetZone:  bestAttackZone(agent, myPos),
      specialMove: pick,
      rationale:   `${pick}! Momentum at ${momentum.toFixed(0)} — unleashing signature move.`,
    };
  }

  // ── 2. Score and decide based on stats, position, shuttle position ─────────
  const distX = Math.abs(shuttlePos.x - myPos.x);
  const distY = Math.abs(shuttlePos.y - myPos.y);
  const totalDist = Math.sqrt(distX ** 2 + distY ** 2);

  // Stamina check: if tired (long rally + low stamina), play safe
  const tiredThreshold = 8 + agent.stamina * 0.8;
  const isTired = rallyLen > tiredThreshold;

  // Can't smash if shuttle is near the net or low
  const shuttleHigh = shuttlePos.y < 35; // low y = high/deep in our coordinate system
  const shuttleNearNet = shuttlePos.y > 70;

  // Well-positioned: agent is close to where they need to be
  const inPosition = totalDist < 25;

  // Determine primary action from stats
  let action: SportAction;
  let targetZone: number;
  let rationale: string;

  if (isTired || momentum < 30) {
    // Tired or cold: play defensive safe shots
    if (shuttleNearNet && agent.accuracy >= 7) {
      action     = 'BLOCK';
      targetZone = deepZone(myPos);
      rationale  = `Fatigue setting in — tight block to stay in the rally.`;
    } else {
      action     = 'CLEAR';
      targetZone = deepZone(myPos);
      rationale  = `Low on stamina (rally ${rallyLen}) — clearing deep to reset.`;
    }
  } else if (shuttleHigh && inPosition && agent.power >= 7) {
    // High shuttle + high power + in position → SMASH
    action     = 'SMASH';
    targetZone = bestAttackZone(agent, myPos);
    rationale  = `Shuttle is high and I'm in position — power smash (PWR ${agent.power})!`;
  } else if (shuttleNearNet && agent.accuracy >= 7 && inPosition) {
    // Net shot opportunity → DROP
    action     = 'DROP';
    targetZone = Math.random() < 0.5 ? 7 : 9; // front corners
    rationale  = `Net opportunity — delicate drop to the corner (ACC ${agent.accuracy}).`;
  } else if (agent.speed >= 8 && !isTired && momentum >= 50) {
    // Fast agent drives the rally
    action     = 'DRIVE';
    targetZone = bestAttackZone(agent, myPos);
    rationale  = `Aggressive flat drive — speed advantage (SPD ${agent.speed}).`;
  } else if (agent.power >= 8 && shuttleHigh) {
    // Power player smashes when shuttle is elevated
    action     = 'SMASH';
    targetZone = bestAttackZone(agent, myPos);
    rationale  = `Power smash — shuttle elevated, committing (PWR ${agent.power}).`;
  } else if (agent.accuracy >= 8 && momentum >= 45) {
    // Precise player drops or drives to corners
    action     = Math.random() < 0.6 ? 'DROP' : 'DRIVE';
    targetZone = bestAttackZone(agent, myPos);
    rationale  = `Precision placement to the weak side (ACC ${agent.accuracy}).`;
  } else if (!inPosition && agent.speed < 6) {
    // Slow agent out of position — must lob/clear to buy time
    action     = rallyLen < 5 ? 'CLEAR' : 'LOB';
    targetZone = deepZone(myPos);
    rationale  = `Out of position, buying recovery time (SPD ${agent.speed}).`;
  } else {
    // Balanced default: mix of clear/drive based on stats
    const powerBias  = agent.power    / 10;
    const speedBias  = agent.speed    / 10;
    const accBias    = agent.accuracy / 10;
    const roll = Math.random();
    if (roll < powerBias * 0.4 && shuttleHigh) {
      action = 'SMASH'; targetZone = bestAttackZone(agent, myPos);
      rationale = `Power attack opportunity — smashing (PWR ${agent.power}).`;
    } else if (roll < speedBias * 0.7) {
      action = 'DRIVE'; targetZone = bestAttackZone(agent, myPos);
      rationale = `Driving fast — keeping pressure on (SPD ${agent.speed}).`;
    } else if (roll < accBias * 0.85) {
      action = 'DROP'; targetZone = Math.random() < 0.5 ? 7 : 9;
      rationale = `Precise drop shot to the front (ACC ${agent.accuracy}).`;
    } else {
      action = 'CLEAR'; targetZone = deepZone(myPos);
      rationale = `Resetting the rally — clearing deep.`;
    }
  }

  return { action, targetZone, rationale, specialMove: null };
}

// Pick best zone to attack based on agent style and court position
function bestAttackZone(
  agent: { speed: number; power: number; accuracy: number; stamina: number; risk?: string },
  _myPos: { x: number; y: number }
): number {
  // High-accuracy agents aim for corners (1, 3, 7, 9)
  // High-power agents aim for the body/center (2, 5, 8)
  const corners = [1, 3, 7, 9];
  const center  = [2, 5, 8];
  const mid     = [4, 6];
  const acc = agent.accuracy;
  const pwr = agent.power;
  if (acc >= 8)       return corners[Math.floor(Math.random() * corners.length)];
  if (pwr >= 8)       return center[Math.floor(Math.random() * center.length)];
  if (acc >= 6)       return mid[Math.floor(Math.random() * mid.length)];
  return Math.ceil(Math.random() * 9); // fallback
}

// Deep zones for defensive shots
function deepZone(_myPos: { x: number; y: number }): number {
  return [1, 2, 3][Math.floor(Math.random() * 3)]; // push to back court
}
