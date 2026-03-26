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

// ── Attack success probability ──────────────────────────────────────────────────
function attackSuccessProb(
  action: SportAction,
  stats: { speed: number; power: number; accuracy: number; stamina: number },
  momentum: number,
  rallyLength: number,
): number {
  const momentumBonus = (momentum - 50) / 600; // ±0.083
  // Stamina decay: longer rallies tire agents with low stamina
  const staminaDecay = Math.max(0, 1 - (rallyLength * (1 - stats.stamina / 12)) / 40);

  const base: Record<SportAction, number> = {
    SERVE:   0.92,
    CLEAR:   0.88,
    LOB:     0.83,
    BLOCK:   0.80,
    DRIVE:   0.75,
    DROP:    0.72,
    SMASH:   0.65,
    SPECIAL: 0.58,
  };

  const statMod =
    action === 'SMASH'   ? (stats.power - 5) / 60 :
    action === 'DROP'    ? (stats.accuracy - 5) / 60 :
    action === 'DRIVE'   ? (stats.speed - 5) / 60 :
    action === 'CLEAR'   ? (stats.stamina - 5) / 60 :
    action === 'SPECIAL' ? Math.max(stats.power, stats.accuracy, stats.speed - 5) / 80 :
    0;

  return Math.min(0.95, Math.max(0.25,
    base[action] + statMod + momentumBonus
  )) * staminaDecay;
}

// ── Defense (return) probability ────────────────────────────────────────────────
// Can the OTHER agent return this shot?
function defenseReturnProb(
  attackAction: SportAction,
  defenderStats: { speed: number; power: number; accuracy: number; stamina: number },
  defenderMomentum: number,
  rallyLength: number,
): number {
  const momentumBonus = (defenderMomentum - 50) / 600;
  const staminaDecay = Math.max(0, 1 - (rallyLength * (1 - defenderStats.stamina / 12)) / 40);

  // How hard is each shot to return?
  const difficulty: Record<SportAction, number> = {
    SMASH:   0.40, // hardest to return
    SPECIAL: 0.42,
    DROP:    0.50,
    DRIVE:   0.58,
    LOB:     0.70,
    CLEAR:   0.75,
    BLOCK:   0.72,
    SERVE:   0.80,
  };

  const speedBonus  = (defenderStats.speed - 5) / 50;
  const reflexBonus = (defenderStats.accuracy - 5) / 80; // reads the shot

  return Math.min(0.90, Math.max(0.20,
    difficulty[attackAction] + speedBonus + reflexBonus + momentumBonus
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

  // Step 1: Does the attacker execute their shot successfully?
  const attackProb = attackSuccessProb(
    attackDecision.action, attackStats, attackMomentum, gameState.rallyLength
  );
  const attackSuccess = Math.random() < attackProb;

  // Step 2: If attack succeeds, can the defender return it?
  const defenseProb = attackSuccess
    ? defenseReturnProb(attackDecision.action, defenderStats, defenderMomentum, gameState.rallyLength)
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

  // ── Move shuttle ──────────────────────────────────────────────────────────
  const zone = attackDecision.targetZone;
  const zoneX = [50, 20, 50, 80, 20, 50, 80, 20, 50, 80][zone] ?? 50;
  const zoneY = attackerId === agentIds[0]
    ? [50, 15, 15, 15, 40, 40, 40, 65, 65, 65][zone] ?? 30
    : [50, 85, 85, 85, 60, 60, 60, 35, 35, 35][zone] ?? 70;
  const newShuttlePos = {
    x: zoneX + (Math.random() - 0.5) * 15,
    y: rallyEnds ? 50 : zoneY + (Math.random() - 0.5) * 10,
  };

  // ── Move agents toward their shot target ──────────────────────────────────
  const newPositions = { ...gameState.agentPositions };
  newPositions[attackerId] = {
    x: 30 + Math.random() * 40,
    y: attackerId === agentIds[0] ? 60 + Math.random() * 25 : 15 + Math.random() * 25,
  };
  if (!rallyEnds) {
    // Defender moves toward the shuttle to return
    newPositions[defenderId] = {
      x: newShuttlePos.x + (Math.random() - 0.5) * 20,
      y: defenderId === agentIds[0] ? 60 + Math.random() * 25 : 15 + Math.random() * 25,
    };
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
