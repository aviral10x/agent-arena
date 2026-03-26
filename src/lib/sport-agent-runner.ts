/**
 * Badminton Agent Runner — archetype-driven tactical AI
 *
 * Decision pipeline:
 *  1. Read shuttle height → determine what shots are physically valid
 *  2. Check fatigue → force defensive play if exhausted
 *  3. Apply archetype bias → each agent style prefers different shot patterns
 *  4. Use LLM (Groq) if key available, with height-aware prompt
 *  5. Fallback: deterministic stat+height decision — no random pools
 */

import { z }        from 'zod';
import type { Agent } from '@prisma/client';
import type { GameState, SportAction, ShotDecision } from './game-engine';

export const ShotDecisionSchema = z.object({
  action: z.enum(['SERVE','SMASH','DROP','CLEAR','DRIVE','LOB','BLOCK','SPECIAL']),
  targetZone: z.number().min(1).max(9),
  specialMove: z.string().nullable(),
  rationale: z.string(),
});

export type SportAgent = Agent & {
  speed:        number;
  power:        number;
  stamina:      number;
  accuracy:     number;
  specialMoves: string; // JSON string
};

// ── Archetype → tactical profile ──────────────────────────────────────────────
type TacticProfile = {
  smashBias:    number; // 0–1 preference for smash when opportunity exists
  dropBias:     number; // 0–1 preference for drop shots
  driveBias:    number;
  clearBias:    number;
  netRushes:    boolean; // tends to rush net after a drop
  aggression:   number; // 0–1: how often they attack vs defend
  description:  string;
};

function getArchetypeProfile(archetype: string): TacticProfile {
  const a = (archetype ?? '').toLowerCase();

  if (a.includes('power') || a.includes('hitter') || a.includes('aggress')) {
    return { smashBias:0.70, dropBias:0.10, driveBias:0.15, clearBias:0.05, netRushes:false, aggression:0.80,
      description:'Power Hitter — clears to set up smashes, rarely defends' };
  }
  if (a.includes('speed') || a.includes('fast') || a.includes('sprint')) {
    return { smashBias:0.25, dropBias:0.20, driveBias:0.50, clearBias:0.05, netRushes:true, aggression:0.70,
      description:'Speed Player — fast flat drives, rushes net, exploits open court' };
  }
  if (a.includes('precise') || a.includes('technical') || a.includes('accuracy')) {
    return { smashBias:0.20, dropBias:0.50, driveBias:0.15, clearBias:0.15, netRushes:true, aggression:0.65,
      description:'Precision Player — deceptive drops, angles, net exchanges' };
  }
  if (a.includes('defensive') || a.includes('wall') || a.includes('stamina')) {
    return { smashBias:0.10, dropBias:0.15, driveBias:0.20, clearBias:0.55, netRushes:false, aggression:0.30,
      description:'Defensive Specialist — deep clears, waits for forced errors' };
  }
  if (a.includes('adaptive') || a.includes('all-rounder') || a.includes('allrounder')) {
    return { smashBias:0.35, dropBias:0.25, driveBias:0.25, clearBias:0.15, netRushes:true, aggression:0.55,
      description:'All-Rounder — adapts to opponent, mixed repertoire' };
  }
  // Default balanced
  return { smashBias:0.30, dropBias:0.25, driveBias:0.25, clearBias:0.20, netRushes:false, aggression:0.50,
    description:'Balanced — no strong tactical bias' };
}

// ── What shots are realistically viable at this shuttle height? ───────────────
function viableShots(shuttleHeight: number, isNearNet: boolean): SportAction[] {
  const shots: SportAction[] = [];

  if (shuttleHeight >= 2.0) {
    shots.push('SMASH', 'DROP', 'CLEAR');
  } else if (shuttleHeight >= 1.5) {
    shots.push('DROP', 'CLEAR', 'DRIVE');
    if (shuttleHeight >= 1.8) shots.push('SMASH'); // risky but possible
  } else if (shuttleHeight >= 0.8) {
    shots.push('DRIVE', 'LOB', 'CLEAR');
  } else {
    // Shuttle is near ground/net level
    shots.push('LOB', 'DRIVE');
    if (isNearNet) shots.push('BLOCK'); // net kill from forecourt
  }

  return shots.length > 0 ? shots : ['CLEAR'];
}

// ── Main decision function ─────────────────────────────────────────────────────
export async function executeSportAgentTurn(
  agent: SportAgent,
  gameState: GameState,
  opponentId: string,
  opponentName: string,
): Promise<ShotDecision> {
  const myScore     = gameState.sets[gameState.currentSet]?.agentScores[agent.id] ?? 0;
  const oppScore    = gameState.sets[gameState.currentSet]?.agentScores[opponentId] ?? 0;
  const myMomentum  = gameState.momentum[agent.id] ?? 50;
  const myFatigue   = (gameState.fatigue as Record<string,number>)?.[agent.id] ?? 0;
  const shuttleH    = gameState.shuttleHeight ?? 2.0;
  const shuttlePos  = gameState.shuttlePosition;
  const myPos       = gameState.agentPositions[agent.id];
  const trainerCmd  = gameState.trainerCommands[agent.id];

  let specialMovesArr: string[] = [];
  try { specialMovesArr = JSON.parse(agent.specialMoves || '[]'); } catch {}

  const heightLabel =
    shuttleH >= 2.5 ? 'OVERHEAD (prime smash height)' :
    shuttleH >= 2.0 ? 'HIGH (overhead drop/clear/smash)' :
    shuttleH >= 1.5 ? 'MID-HIGH (drop or drive)' :
    shuttleH >= 0.8 ? 'MID (drive or lob)' :
    shuttleH >= 0.3 ? 'LOW (lob or net shot only)' :
    'NEAR-GROUND (lob or desperate block)';

  const validList = viableShots(shuttleH, shuttlePos.y > 65).join(' / ');

  const prompt = `You are a badminton AI agent in a live match.

AGENT: ${agent.name} | Archetype: ${agent.archetype ?? 'All-Rounder'}
STATS: Speed ${agent.speed}/10  Power ${agent.power}/10  Accuracy ${agent.accuracy}/10  Stamina ${agent.stamina}/10
SPECIALS: ${specialMovesArr.join(', ') || 'none'}
MOMENTUM: ${myMomentum.toFixed(0)}/100${myMomentum > 65 ? ' 🔥 HOT' : myMomentum < 35 ? ' 🥶 COLD' : ''}
FATIGUE: ${myFatigue.toFixed(0)}/100${myFatigue > 70 ? ' (exhausted — must play defensively)' : myFatigue > 40 ? ' (tiring)' : ' (fresh)'}

MATCH STATE:
Score: You ${myScore} – ${oppScore} ${opponentName} | Set ${gameState.currentSet + 1}
Rally length: ${gameState.rallyLength} shots
Last shot: ${gameState.lastAction}
Shuttle height: ${shuttleH.toFixed(1)} → ${heightLabel}
VALID SHOTS THIS EXCHANGE: ${validList}
${trainerCmd ? `\n🎯 TRAINER: "${trainerCmd}" — OBEY THIS NOW!\n` : ''}

PHYSICS RULES (must follow):
- SMASH only valid if shuttle height >= 2.0 (overhead); picking SMASH at low height has ~8% success
- LOB / BLOCK only valid if height <= 1.2
- DROP works best at height >= 2.0; weak if height < 1.0
- SPECIAL: use only if momentum > 65 AND height >= 2.0
- If fatigue > 70: play CLEAR or LOB to recover position

Reply with JSON only: {"action":"...","targetZone":1-9,"specialMove":null,"rationale":"one sentence"}`;

  const groqKey   = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    return generateMockDecision(agent, gameState, specialMovesArr);
  }

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
            content: `You are a badminton AI making shot decisions. CRITICAL: respect shuttle height physics. Reply ONLY with valid JSON: {"action":"SMASH"|"DROP"|"CLEAR"|"DRIVE"|"LOB"|"BLOCK"|"SERVE"|"SPECIAL","targetZone":1-9,"specialMove":null,"rationale":"one sentence"}`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 120,
        response_format: { type: 'json_object' },
      });
      const raw    = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      const valid  = ['SERVE','SMASH','DROP','CLEAR','DRIVE','LOB','BLOCK','SPECIAL'];
      if (valid.includes(parsed.action)) {
        return {
          action:     parsed.action as SportAction,
          targetZone: Math.max(1, Math.min(9, Number(parsed.targetZone) || 5)),
          specialMove: parsed.specialMove ?? null,
          rationale:  parsed.rationale ?? 'Tactical decision.',
        };
      }
    } catch (err: any) {
      console.warn(`[sport-agent] Groq error for ${agent.name}: ${err.message?.slice(0,60)}`);
    }
  }

  if (openaiKey) {
    try {
      const { generateObject } = await import('ai');
      const { openai }         = await import('@ai-sdk/openai');
      const { object } = await generateObject({ model: openai('gpt-4o-mini'), schema: ShotDecisionSchema, prompt });
      return object;
    } catch (err: any) {
      console.warn(`[sport-agent] OpenAI error for ${agent.name}: ${err.message?.slice(0,60)}`);
    }
  }

  return generateMockDecision(agent, gameState, specialMovesArr);
}

// ── Parse trainer command into a forced action ────────────────────────────────
function parseTrainerCommand(cmd: string | null | undefined): SportAction | null {
  if (!cmd) return null;
  const c = cmd.toLowerCase();
  if (c.includes('smash'))    return 'SMASH';
  if (c.includes('drop'))     return 'DROP';
  if (c.includes('clear'))    return 'CLEAR';
  if (c.includes('drive'))    return 'DRIVE';
  if (c.includes('lob') || c.includes('lift'))  return 'LOB';
  if (c.includes('net') || c.includes('block') || c.includes('kill')) return 'BLOCK';
  if (c.includes('special') || c.includes('signature') || c.includes('ultimate')) return 'SPECIAL';
  if (c.includes('aggress') || c.includes('attack') || c.includes('offense')) return 'SMASH';
  if (c.includes('defend') || c.includes('safe') || c.includes('reset')) return 'CLEAR';
  return null;
}

// ── Deterministic stat+height fallback (no random pools) ──────────────────────
export function generateMockDecision(
  agent: { id?: string; speed: number; power: number; accuracy: number; stamina: number; archetype?: string },
  gameState: GameState,
  specialMoves: string[],
): ShotDecision {
  const agentId   = ('id' in agent ? (agent as any).id : '') as string;
  const momentum  = gameState.momentum[agentId] ?? 50;
  const fatigue   = (gameState.fatigue as Record<string,number>)?.[agentId] ?? 0;
  const height    = gameState.shuttleHeight ?? 2.0;
  const myPos     = gameState.agentPositions[agentId] ?? { x: 50, y: 50 };
  const profile   = getArchetypeProfile(agent.archetype ?? '');
  const rallyLen  = gameState.rallyLength;

  // 0. Trainer command override — obey the coach
  const trainerCmd = gameState.trainerCommands?.[agentId];
  const forcedAction = parseTrainerCommand(trainerCmd);
  if (forcedAction) {
    const targetZone = selectTargetZone(forcedAction, agent, myPos);
    const isSpecial = forcedAction === 'SPECIAL' && specialMoves.length > 0;
    return {
      action: forcedAction,
      targetZone,
      specialMove: isSpecial ? specialMoves[Math.floor(Math.random() * specialMoves.length)] : null,
      rationale: `TRAINER COMMAND: "${trainerCmd}" → forced ${forcedAction}`,
    };
  }

  // 1. Force defensive if exhausted
  if (fatigue > 72 || momentum < 25) {
    const action: SportAction = height >= 1.5 ? 'CLEAR' : 'LOB';
    return { action, targetZone: deepZone(), rationale: `Fatigue at ${fatigue.toFixed(0)} — mandatory recovery.`, specialMove: null };
  }

  // 2. Special move: only when HOT and shuttle is high enough
  const specialThreshold = 78 - (Math.max(agent.power, agent.accuracy) - 5) * 1.5;
  if (momentum >= specialThreshold && specialMoves.length > 0 && height >= 2.0 && rallyLen >= 3) {
    const pick = specialMoves[Math.floor(Math.random() * specialMoves.length)];
    return { action: 'SPECIAL', targetZone: attackZone(agent, myPos), specialMove: pick,
      rationale: `${pick} — momentum ${momentum.toFixed(0)}, shuttle overhead!` };
  }

  // 3. Determine valid shots for current shuttle height
  const valid = viableShots(height, myPos.y > 65);

  // 4. Archetype-driven weighted selection
  const isOverhead  = height >= 2.0;
  const isMid       = height >= 0.8 && height < 2.0;
  const isLow       = height < 0.8;
  const inPosition  = dist2d(myPos, gameState.shuttlePosition) < 28;
  const nearNet     = myPos.y > 65;

  let action: SportAction;
  let rationale: string;

  if (isOverhead && inPosition) {
    // Overhead — attacker's paradise
    const smashRoll = Math.random();
    if (smashRoll < profile.smashBias && agent.power >= 6 && valid.includes('SMASH')) {
      action = 'SMASH';
      rationale = `Shuttle overhead — ${profile.description.split('—')[0].trim()} smashes (PWR ${agent.power})!`;
    } else if (smashRoll < profile.smashBias + profile.dropBias && agent.accuracy >= 6 && valid.includes('DROP')) {
      action = 'DROP';
      rationale = `Deceptive overhead drop — drawing opponent to net (ACC ${agent.accuracy}).`;
    } else {
      action = 'CLEAR';
      rationale = `Defensive clear — resetting the rally.`;
    }
  } else if (isOverhead && !inPosition) {
    // Overhead but out of position — must clear
    action = 'CLEAR';
    rationale = `Out of position — safe clear to recover.`;
  } else if (isMid) {
    // Mid height — drives and lifts
    const midRoll = Math.random();
    if (midRoll < profile.driveBias && agent.speed >= 6 && valid.includes('DRIVE')) {
      action = 'DRIVE';
      rationale = `Flat drive keeping pressure (SPD ${agent.speed}).`;
    } else if (midRoll < profile.driveBias + profile.dropBias && agent.accuracy >= 7 && valid.includes('DROP')) {
      action = 'DROP';
      rationale = `Precision drop from mid-court (ACC ${agent.accuracy}).`;
    } else {
      action = valid.includes('LOB') ? 'LOB' : 'CLEAR';
      rationale = `Lofting shuttle back to force overhead for opponent.`;
    }
  } else {
    // Low shuttle — defensive situation
    if (nearNet && valid.includes('BLOCK')) {
      action = 'BLOCK';
      rationale = `Net kill opportunity — shuttle at net level (SPD ${agent.speed})!`;
    } else if (agent.accuracy >= 7 && valid.includes('DRIVE')) {
      action = 'DRIVE';
      rationale = `Low drive — keeping shuttle fast (SPD ${agent.speed}).`;
    } else {
      action = 'LOB';
      rationale = `Low shuttle — lifting to reset (STM ${agent.stamina}).`;
    }
  }

  // 5. Target zone based on action and archetype
  const targetZone = selectTargetZone(action, agent, myPos);

  return { action, targetZone, rationale, specialMove: null };
}

// ── Zone selection helpers ────────────────────────────────────────────────────

function attackZone(
  agent: { accuracy: number; power: number },
  myPos: { x: number; y: number },
): number {
  // High accuracy → tight corners; high power → body/center
  if (agent.accuracy >= 8) return [1, 3, 7, 9][Math.floor(Math.random() * 4)]; // corners
  if (agent.power    >= 8) return [2, 5, 8][Math.floor(Math.random() * 3)];    // body
  if (agent.accuracy >= 6) return [4, 6][Math.floor(Math.random() * 2)];       // mid-side
  return Math.ceil(Math.random() * 9);
}

function deepZone(): number {
  return [1, 2, 3][Math.floor(Math.random() * 3)]; // back court
}

function selectTargetZone(
  action: SportAction,
  agent: { accuracy: number; power: number; speed: number },
  myPos: { x: number; y: number },
): number {
  switch (action) {
    case 'SMASH':
    case 'SPECIAL':
      return attackZone(agent, myPos);
    case 'DROP':
      // Drop to the corners near net — wrong-foot the opponent
      return Math.random() < 0.5 ? 7 : 9;
    case 'CLEAR':
    case 'LOB':
      // Deep back court, try to push to back corners
      return Math.random() < 0.5 ? 1 : 3;
    case 'DRIVE':
      // Mid or opposite side to where opponent is
      return myPos.x > 50 ? 4 : 6;
    case 'BLOCK':
      // Net shot — tight cross-court
      return Math.random() < 0.5 ? 7 : 9;
    default:
      return 5;
  }
}

function dist2d(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
