/**
 * Sports Game Engine v2 — balanced point-by-point simulation
 *
 * Fixes from v1:
 * - Both agents get a chance each rally (attacker + defender)
 * - Momentum swings are smaller (+5/-5 instead of +8/-8)
 * - Defense has a fair chance to return shots
 * - Score can't run away — comeback mechanics via momentum reset
 * - Rally length matters — longer rallies favor the more stamina-heavy agent
 */

export type SportAction = 'SERVE' | 'SMASH' | 'DROP' | 'CLEAR' | 'DRIVE' | 'LOB' | 'BLOCK' | 'SPECIAL';

export type GameState = {
  sport: 'badminton' | 'tennis' | 'table-tennis';
  servingAgentId: string;
  rallyCount: number;
  currentSet: number;
  sets: { agentScores: Record<string, number> }[];
  shuttlePosition: { x: number; y: number };
  agentPositions: Record<string, { x: number; y: number }>;
  momentum: Record<string, number>;
  lastAction: string;
  lastAgentId: string; // who played the last shot
  rallyLength: number;
  trainerCommands: Record<string, string | null>;
  preComputedDecisions?: Record<string, any>;
  matchOver: boolean;
  winner?: string;
};

export type ShotDecision = {
  action: SportAction;
  targetZone: number;
  specialMove?: string | null;
  rationale: string;
};

export type RallyResult = {
  pointWinnerId: string;
  loserId: string;
  attackerId: string;
  action: string;
  description: string;
  rallyLength: number;
  successRate: number;
  defenseRate: number;
  momentumShift: Record<string, number>;
  newGameState: GameState;
  matchOver: boolean;
  setOver: boolean;
  isWinner: boolean; // did a point end?
};

// ── Scoring rules ──────────────────────────────────────────────────────────────
const SCORING_RULES = {
  badminton:      { pointsPerSet: 21, setsToWin: 2, totalSets: 3, deuceAt: 20, maxPoints: 30 },
  tennis:         { pointsPerSet: 6,  setsToWin: 2, totalSets: 3, deuceAt: 5,  maxPoints: 7  },
  'table-tennis': { pointsPerSet: 11, setsToWin: 3, totalSets: 5, deuceAt: 10, maxPoints: 15 },
};

// ── Distance between two court positions ──────────────────────────────────────
function courtDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── Zone landing positions (0=center, 1–9 as grid) ───────────────────────────
const ZONE_POS: { x: number; y: number }[] = [
  { x: 50, y: 50 }, // 0: center (unused sentinel)
  { x: 20, y: 10 }, // 1: back-left
  { x: 50, y: 10 }, // 2: back-center
  { x: 80, y: 10 }, // 3: back-right
  { x: 20, y: 50 }, // 4: mid-left
  { x: 50, y: 50 }, // 5: center
  { x: 80, y: 50 }, // 6: mid-right
  { x: 20, y: 85 }, // 7: front-left
  { x: 50, y: 85 }, // 8: front-center
  { x: 80, y: 85 }, // 9: front-right
];

// ── Attack success probability (stats + position penalty if out-of-position) ──
function attackSuccessProb(
  action: SportAction,
  stats: { speed: number; power: number; accuracy: number; stamina: number },
  momentum: number,
  rallyLength: number,
  distanceToShuttle: number, // how far attacker had to run to reach shuttle
): number {
  const momentumBonus = (momentum - 50) / 500; // ±0.10
  // Stamina decay — stronger effect than before
  const staminaDecay = Math.max(0.4, 1 - (rallyLength * (1 - stats.stamina / 11)) / 25);
  // Position penalty: if agent had to run far, shot quality drops (mitigated by speed)
  const reachPenalty = Math.max(0, (distanceToShuttle - 20) / 100) * Math.max(0.2, 1 - stats.speed / 12);

  const base: Record<SportAction, number> = {
    SERVE:   0.94,
    CLEAR:   0.88,
    LOB:     0.84,
    BLOCK:   0.82,
    DRIVE:   0.76,
    DROP:    0.70,
    SMASH:   0.62,
    SPECIAL: 0.55,
  };

  // Stat modifier — wider range so stats matter more
  const statMod =
    action === 'SMASH'   ? (stats.power    - 5) / 40 :
    action === 'DROP'    ? (stats.accuracy - 5) / 40 :
    action === 'DRIVE'   ? (stats.speed    - 5) / 40 :
    action === 'CLEAR'   ? (stats.stamina  - 5) / 50 :
    action === 'LOB'     ? (stats.stamina  - 5) / 60 :
    action === 'BLOCK'   ? (stats.speed    - 5) / 60 :
    action === 'SPECIAL' ? (Math.max(stats.power, stats.accuracy) - 5) / 50 :
    0;

  return Math.min(0.96, Math.max(0.15,
    base[action] + statMod + momentumBonus - reachPenalty
  )) * staminaDecay;
}

// ── Defense (return) probability ────────────────────────────────────────────────
// Core mechanic: defender must physically REACH the shuttle landing zone.
// If they're too slow or too far away, they can't return it.
function defenseReturnProb(
  attackAction: SportAction,
  targetZone: number,
  defenderPos: { x: number; y: number },
  defenderStats: { speed: number; power: number; accuracy: number; stamina: number },
  defenderMomentum: number,
  rallyLength: number,
): number {
  const momentumBonus = (defenderMomentum - 50) / 500;
  const staminaDecay = Math.max(0.4, 1 - (rallyLength * (1 - defenderStats.stamina / 11)) / 25);

  // How hard each shot type is to return (base difficulty)
  const difficulty: Record<SportAction, number> = {
    SMASH:   0.35, // hardest — fast and steep
    SPECIAL: 0.38,
    DRIVE:   0.50,
    DROP:    0.48, // requires good positioning
    LOB:     0.72,
    CLEAR:   0.76,
    BLOCK:   0.70,
    SERVE:   0.82,
  };

  // Distance the defender must cover to reach landing zone
  const landingPos = ZONE_POS[Math.max(1, Math.min(9, targetZone))] ?? ZONE_POS[5];
  const dist = courtDistance(defenderPos, landingPos);
  // Reach factor: speed-10 agent barely needs to move; speed-1 agent struggles
  // Each 10 units of distance reduces return prob by (1 - speed/12) * 0.08
  const reachPenalty = (dist / 10) * Math.max(0.01, 1 - defenderStats.speed / 12) * 0.12;

  const speedBonus  = (defenderStats.speed    - 5) / 45;
  const reflexBonus = (defenderStats.accuracy - 5) / 70;

  return Math.min(0.92, Math.max(0.10,
    difficulty[attackAction] + speedBonus + reflexBonus + momentumBonus - reachPenalty
  )) * staminaDecay;
}

// ── Initialize game state ──────────────────────────────────────────────────────
export function initGameState(
  sport: 'badminton' | 'tennis' | 'table-tennis',
  agentIds: string[],
  servingFirst?: string
): GameState {
  return {
    sport,
    servingAgentId: servingFirst ?? agentIds[0],
    rallyCount: 0,
    currentSet: 0,
    sets: [{ agentScores: Object.fromEntries(agentIds.map(id => [id, 0])) }],
    shuttlePosition: { x: 50, y: 50 },
    agentPositions: Object.fromEntries(
      agentIds.map((id, i) => [id, { x: 50, y: i === 0 ? 75 : 25 }])
    ),
    momentum: Object.fromEntries(agentIds.map(id => [id, 50])),
    lastAction: 'SERVE',
    lastAgentId: servingFirst ?? agentIds[0],
    rallyLength: 0,
    trainerCommands: Object.fromEntries(agentIds.map(id => [id, null])),
    matchOver: false,
  };
}

// ── Core rally resolution ──────────────────────────────────────────────────────
export function resolveRally(
  gameState: GameState,
  decisions: Record<string, ShotDecision>,
  agentStats: Record<string, { speed: number; power: number; accuracy: number; stamina: number }>
): RallyResult {
  const rules = SCORING_RULES[gameState.sport];
  const agentIds = Object.keys(agentStats);
  const [a1, a2] = agentIds;

  // Determine attacker (who hits) and defender (who tries to return)
  // Rally starts with server, then alternates
  const attackerId = gameState.rallyLength % 2 === 0
    ? gameState.servingAgentId
    : agentIds.find(id => id !== gameState.servingAgentId)!;
  const defenderId = agentIds.find(id => id !== attackerId)!;

  const attackDecision = decisions[attackerId] ?? { action: 'CLEAR' as SportAction, targetZone: 5, rationale: 'fallback' };
  const attackStats = agentStats[attackerId];
  const defenderStats = agentStats[defenderId];
  const attackMomentum = gameState.momentum[attackerId] ?? 50;
  const defenderMomentum = gameState.momentum[defenderId] ?? 50;

  // How far did the attacker have to run to reach the shuttle?
  const attackerPos = gameState.agentPositions[attackerId] ?? { x: 50, y: 50 };
  const distToShuttle = courtDistance(attackerPos, gameState.shuttlePosition);

  // Step 1: Does the attacker execute their shot successfully?
  const attackProb = attackSuccessProb(
    attackDecision.action, attackStats, attackMomentum, gameState.rallyLength, distToShuttle
  );
  const attackSuccess = Math.random() < attackProb;

  // Step 2: If attack succeeds, can the defender physically reach and return it?
  const defenderPos = gameState.agentPositions[defenderId] ?? { x: 50, y: 50 };
  const defenseProb = attackSuccess
    ? defenseReturnProb(
        attackDecision.action,
        attackDecision.targetZone,
        defenderPos,
        defenderStats,
        defenderMomentum,
        gameState.rallyLength,
      )
    : 1; // attack failed, defender wins by default
  const defenseSuccess = attackSuccess ? Math.random() < defenseProb : true;

  // Determine outcome
  const isSpecial = attackDecision.action === 'SPECIAL';
  const specialCost = isSpecial ? 15 : 0;

  let pointWinnerId = '';
  let loserId = '';
  let rallyEnds = false;

  if (!attackSuccess) {
    // Attacker messed up → defender wins point
    rallyEnds = true;
    pointWinnerId = defenderId;
    loserId = attackerId;
  } else if (!defenseSuccess) {
    // Attacker's shot was unreturnable → attacker wins point
    rallyEnds = true;
    pointWinnerId = attackerId;
    loserId = defenderId;
  } else {
    // Both succeeded → rally continues
    rallyEnds = false;
    // Unless it's been going on too long
    if (gameState.rallyLength >= 20) {
      rallyEnds = true;
      // Stamina decides who collapses
      const a1Stamina = agentStats[a1].stamina + (gameState.momentum[a1] ?? 50) / 50;
      const a2Stamina = agentStats[a2].stamina + (gameState.momentum[a2] ?? 50) / 50;
      pointWinnerId = a1Stamina >= a2Stamina ? a1 : a2;
      loserId = agentIds.find(id => id !== pointWinnerId)!;
    }
  }

  // ── Update scores ─────────────────────────────────────────────────────────
  const newSets = gameState.sets.map(s => ({
    ...s, agentScores: { ...s.agentScores },
  }));
  let setOver = false;
  let newCurrentSet = gameState.currentSet;
  let matchOver = false;
  let winner: string | undefined;

  if (rallyEnds && pointWinnerId) {
    const scores = newSets[gameState.currentSet].agentScores;
    scores[pointWinnerId] = (scores[pointWinnerId] ?? 0) + 1;

    const myScore  = scores[pointWinnerId];
    const oppScore = scores[loserId] ?? 0;
    const wonSet = myScore >= rules.pointsPerSet &&
                   (myScore - oppScore >= 2 || myScore >= rules.maxPoints);

    if (wonSet) {
      setOver = true;
      const setsWon = newSets.filter((s, i) => {
        if (i > newCurrentSet) return false;
        const vals = Object.values(s.agentScores);
        return s.agentScores[pointWinnerId] === Math.max(...vals) && Math.max(...vals) > 0;
      }).length;

      if (setsWon >= rules.setsToWin) {
        matchOver = true;
        winner = pointWinnerId;
      } else {
        newCurrentSet++;
        newSets.push({ agentScores: Object.fromEntries(agentIds.map(id => [id, 0])) });
      }
    }
  }

  // ── Update momentum (smaller swings, comeback mechanic) ───────────────────
  const newMomentum = { ...gameState.momentum };
  if (rallyEnds && pointWinnerId) {
    newMomentum[pointWinnerId] = Math.min(85, newMomentum[pointWinnerId] + 5);
    newMomentum[loserId]       = Math.max(20, newMomentum[loserId] - 4);
    // Comeback mechanic: if score gap > 5, losing agent gets momentum boost
    const scores = newSets[gameState.currentSet].agentScores;
    const gap = (scores[pointWinnerId] ?? 0) - (scores[loserId] ?? 0);
    if (gap > 5) {
      newMomentum[loserId] = Math.min(55, newMomentum[loserId] + 3);
    }
    if (isSpecial) {
      newMomentum[attackerId] = Math.max(15, newMomentum[attackerId] - specialCost);
    }
  }

  // ── Move shuttle to target zone ───────────────────────────────────────────
  const zone = Math.max(1, Math.min(9, attackDecision.targetZone));
  const zoneLanding = ZONE_POS[zone] ?? ZONE_POS[5];
  // Accuracy-based spread: low accuracy = more scatter around intended zone
  const spread = Math.max(3, 18 - attackStats.accuracy * 1.5);
  const newShuttlePos = {
    x: Math.max(5, Math.min(95, zoneLanding.x + (Math.random() - 0.5) * spread)),
    y: rallyEnds ? 50 : Math.max(5, Math.min(95, zoneLanding.y + (Math.random() - 0.5) * spread)),
  };

  // ── Move agents: attacker recovers to base; defender chases shuttle ────────
  const newPositions = { ...gameState.agentPositions };
  // Attacker moves to where they hit from, then starts recovering
  newPositions[attackerId] = {
    x: attackerPos.x + (50 - attackerPos.x) * 0.4 + (Math.random() - 0.5) * 10,
    y: attackerId === agentIds[0]
      ? Math.max(55, Math.min(95, attackerPos.y + (Math.random() - 0.5) * 10))
      : Math.max(5,  Math.min(45, attackerPos.y + (Math.random() - 0.5) * 10)),
  };
  if (!rallyEnds) {
    // Defender sprints toward the shuttle landing zone
    // Speed determines how close they can get (high speed = reaches exactly; low speed = arrives late)
    const coverage = Math.min(1.0, defenderStats.speed / 8);
    const defTarget = {
      x: newShuttlePos.x + (defenderPos.x - newShuttlePos.x) * (1 - coverage),
      y: newShuttlePos.y + (defenderPos.y - newShuttlePos.y) * (1 - coverage),
    };
    newPositions[defenderId] = {
      x: Math.max(5, Math.min(95, defTarget.x + (Math.random() - 0.5) * 8)),
      y: Math.max(5, Math.min(95, defTarget.y + (Math.random() - 0.5) * 8)),
    };
  } else {
    // Reset positions to base after point
    newPositions[attackerId] = { x: 50, y: attackerId === agentIds[0] ? 75 : 25 };
    newPositions[defenderId] = { x: 50, y: defenderId === agentIds[0] ? 75 : 25 };
  }

  // ── Build description ──────────────────────────────────────────────────────
  const actionLabel = isSpecial && attackDecision.specialMove
    ? `✨ ${attackDecision.specialMove}` : attackDecision.action;
  const zones = ['', 'deep left', 'deep center', 'deep right', 'mid left', 'center', 'mid right', 'short left', 'short center', 'short right'];
  const zoneName = zones[attackDecision.targetZone] ?? 'court';
  const attackerName = attackerId; // will be resolved to name in UI

  let description: string;
  if (!rallyEnds) {
    description = `${actionLabel} to ${zoneName} — rally continues (${gameState.rallyLength + 1} shots)`;
  } else if (pointWinnerId === attackerId) {
    description = `${actionLabel} to ${zoneName} — UNRETURNABLE! ${gameState.rallyLength + 1}-shot rally`;
  } else {
    description = `${actionLabel} to ${zoneName} — OUT! ${gameState.rallyLength + 1}-shot rally`;
  }

  // ── Clear consumed trainer commands ────────────────────────────────────────
  const newTrainerCommands = { ...gameState.trainerCommands };
  newTrainerCommands[attackerId] = null;

  const newGameState: GameState = {
    ...gameState,
    sets: newSets,
    currentSet: newCurrentSet,
    shuttlePosition: newShuttlePos,
    agentPositions: newPositions,
    momentum: newMomentum,
    lastAction: attackDecision.action,
    lastAgentId: attackerId,
    rallyLength: rallyEnds ? 0 : gameState.rallyLength + 1,
    rallyCount: gameState.rallyCount + (rallyEnds ? 1 : 0),
    servingAgentId: rallyEnds && pointWinnerId ? pointWinnerId : gameState.servingAgentId,
    trainerCommands: newTrainerCommands,
    matchOver,
    winner,
  };

  return {
    pointWinnerId: pointWinnerId || '',
    loserId: loserId || '',
    attackerId,
    action: attackDecision.action,
    description,
    rallyLength: gameState.rallyLength + 1,
    successRate: attackProb,
    defenseRate: defenseProb,
    momentumShift: newMomentum,
    newGameState,
    matchOver,
    setOver,
    isWinner: rallyEnds && !!pointWinnerId,
  };
}

// ── Score display helper ────────────────────────────────────────────────────────
export function getScoreDisplay(
  gameState: GameState,
  agentIds: [string, string]
): {
  sets:     { a1: number; a2: number }[];
  current:  { a1: number; a2: number };
  setsWon:  { a1: number; a2: number };
} {
  const sets = gameState.sets.map(s => ({
    a1: s.agentScores[agentIds[0]] ?? 0,
    a2: s.agentScores[agentIds[1]] ?? 0,
  }));

  const countSetsWon = (agentId: string) =>
    gameState.sets.filter((s, i) => {
      if (i >= gameState.currentSet && !gameState.matchOver) return false;
      const vals = Object.values(s.agentScores);
      return s.agentScores[agentId] === Math.max(...vals) && Math.max(...vals) > 0;
    }).length;

  return {
    sets,
    current: sets[gameState.currentSet] ?? { a1: 0, a2: 0 },
    setsWon: { a1: countSetsWon(agentIds[0]), a2: countSetsWon(agentIds[1]) },
  };
}
