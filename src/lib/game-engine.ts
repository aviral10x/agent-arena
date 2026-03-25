/**
 * Sports Game Engine — deterministic point-by-point simulation
 * Supports: badminton, tennis, table-tennis
 *
 * Called from orchestrator.ts for sport competitions.
 * Each tick resolves one rally and updates game state.
 */

export type SportAction = 'SERVE' | 'SMASH' | 'DROP' | 'CLEAR' | 'DRIVE' | 'LOB' | 'BLOCK' | 'SPECIAL';

export type GameState = {
  sport: 'badminton' | 'tennis' | 'table-tennis';
  servingAgentId: string;
  rallyCount: number;
  currentSet: number;
  sets: { agentScores: Record<string, number> }[];
  shuttlePosition: { x: number; y: number }; // 0–100 court coordinates
  agentPositions: Record<string, { x: number; y: number }>;
  momentum: Record<string, number>; // 0–100
  lastAction: string;
  rallyLength: number; // shots in current rally
  trainerCommands: Record<string, string | null>; // agentId → latest trainer command
  matchOver: boolean;
  winner?: string;
};

export type ShotDecision = {
  action: SportAction;
  targetZone: number; // 1–9 grid (1=back-left, 5=center, 9=front-right)
  specialMove?: string | null;
  rationale: string;
};

export type RallyResult = {
  pointWinnerId: string; // empty string if rally is still ongoing
  action: string;
  description: string;
  rallyLength: number;
  successRate: number; // 0–1
  momentumShift: Record<string, number>;
  newGameState: GameState;
  matchOver: boolean;
  setOver: boolean;
};

// ── Scoring rules ──────────────────────────────────────────────────────────────
const SCORING_RULES = {
  badminton:     { pointsPerSet: 21, setsToWin: 2, totalSets: 3, deuceAt: 20 },
  tennis:        { pointsPerSet: 4,  setsToWin: 2, totalSets: 3, deuceAt: 3  }, // simplified
  'table-tennis':{ pointsPerSet: 11, setsToWin: 3, totalSets: 5, deuceAt: 10 },
};

// ── Shot success probability ────────────────────────────────────────────────────
function calculateSuccessProb(
  action: SportAction,
  agentStats: { speed: number; power: number; accuracy: number; stamina: number },
  momentum: number,
  shuttleY: number // 0=net, 100=back court
): number {
  const momentumBonus = (momentum - 50) / 500; // ±0.10 max
  const staminaFactor = agentStats.stamina / 10;

  const baseProbabilities: Record<SportAction, number> = {
    SERVE:   0.95,
    CLEAR:   0.90,
    LOB:     0.85,
    BLOCK:   0.80,
    DRIVE:   0.72,
    DROP:    0.68,
    SMASH:   shuttleY < 30 ? 0.45 : 0.78, // smash is risky from back court
    SPECIAL: 0.60,
  };

  const statModifier =
    action === 'SMASH'  ? (agentStats.power    - 5) / 50 :
    action === 'DROP'   ? (agentStats.accuracy  - 5) / 50 :
    action === 'DRIVE'  ? (agentStats.speed     - 5) / 50 :
    0;

  return Math.min(0.97, Math.max(0.15,
    baseProbabilities[action] + statModifier + momentumBonus
  )) * (0.8 + staminaFactor * 0.2);
}

// ── Initialize a fresh game state ──────────────────────────────────────────────
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
      agentIds.map((id, i) => [id, { x: 50, y: i === 0 ? 80 : 20 }])
    ),
    momentum: Object.fromEntries(agentIds.map(id => [id, 50])),
    lastAction: 'SERVE',
    rallyLength: 0,
    trainerCommands: Object.fromEntries(agentIds.map(id => [id, null])),
    matchOver: false,
  };
}

// ── Core rally resolution — called each tick ────────────────────────────────────
export function resolveRally(
  gameState: GameState,
  decisions: Record<string, ShotDecision>,
  agentStats: Record<string, { speed: number; power: number; accuracy: number; stamina: number }>
): RallyResult {
  const rules = SCORING_RULES[gameState.sport];
  const agentIds = Object.keys(agentStats);

  // Determine who is responding this shot (alternating)
  const responderId = gameState.rallyLength % 2 === 0
    ? gameState.servingAgentId
    : agentIds.find(id => id !== gameState.servingAgentId)!;

  const decision = decisions[responderId] ?? decisions[agentIds[0]];
  const stats = agentStats[responderId];
  const momentum = gameState.momentum[responderId] ?? 50;

  const successProb = calculateSuccessProb(
    decision.action, stats, momentum, gameState.shuttlePosition.y
  );
  const shotSuccess = Math.random() < successProb;

  const isSpecial = decision.action === 'SPECIAL';
  const specialCost = isSpecial ? 20 : 0;
  // Killer shot ends the rally with a winner
  const isKillerShot =
    (decision.action === 'SMASH' || decision.action === 'DROP') &&
    shotSuccess &&
    Math.random() < 0.55;
  // Rally ends if: shot fails, killer shot, or max rally length hit
  const rallyEnds = !shotSuccess || isKillerShot || gameState.rallyLength >= 25;

  const pointWinnerId = rallyEnds
    ? (shotSuccess
      ? responderId
      : agentIds.find(id => id !== responderId)!)
    : responderId; // still ongoing

  // Deep copy sets
  const newSets = gameState.sets.map(s => ({
    ...s,
    agentScores: { ...s.agentScores },
  }));
  const currentSetScores = newSets[gameState.currentSet].agentScores;

  let setOver = false;
  let newCurrentSet = gameState.currentSet;
  let matchOver = false;
  let winner: string | undefined;

  if (rallyEnds) {
    currentSetScores[pointWinnerId] = (currentSetScores[pointWinnerId] ?? 0) + 1;

    const myScore  = currentSetScores[pointWinnerId];
    const oppScore = currentSetScores[agentIds.find(id => id !== pointWinnerId)!] ?? 0;
    const deuce    = rules.deuceAt;
    const wonSet   = myScore >= rules.pointsPerSet &&
                     (myScore - oppScore >= 2 || myScore > deuce + 1);

    if (wonSet) {
      setOver = true;
      // Count sets won by this agent across completed sets
      const setsWon = newSets.filter((s, i) => {
        if (i > newCurrentSet) return false;
        const vals = Object.values(s.agentScores);
        return s.agentScores[pointWinnerId] === Math.max(...vals) && Math.max(...vals) > 0;
      }).length;

      if (setsWon >= rules.setsToWin) {
        matchOver = true;
        winner = pointWinnerId;
      } else {
        newCurrentSet = gameState.currentSet + 1;
        newSets.push({
          agentScores: Object.fromEntries(agentIds.map(id => [id, 0])),
        });
      }
    }
  }

  // Update momentum
  const newMomentum = { ...gameState.momentum };
  if (rallyEnds) {
    newMomentum[pointWinnerId] = Math.min(100, newMomentum[pointWinnerId] + 8);
    const loser = agentIds.find(id => id !== pointWinnerId)!;
    newMomentum[loser] = Math.max(0, newMomentum[loser] - 8);
    if (isSpecial) {
      newMomentum[responderId] = Math.max(0, newMomentum[responderId] - specialCost);
    }
  }

  // New shuttle position
  const newShuttlePos = {
    x: 20 + Math.random() * 60,
    y: rallyEnds
      ? 50
      : responderId === agentIds[0]
        ? 20 + Math.random() * 30
        : 50 + Math.random() * 30,
  };

  // New agent positions
  const newAgentPositions = { ...gameState.agentPositions };
  newAgentPositions[responderId] = {
    x: 30 + Math.random() * 40,
    y: agentIds.indexOf(responderId) === 0
      ? 60 + Math.random() * 30
      : 10 + Math.random() * 30,
  };

  // Build human-readable description
  const actionLabel =
    decision.action === 'SPECIAL' && decision.specialMove
      ? `✨ ${decision.specialMove}`
      : decision.action;
  const zoneLabels = [
    '', 'back-left', 'back-center', 'back-right',
    'mid-left', 'center', 'mid-right',
    'front-left', 'front-center', 'front-right',
  ];
  const zone = zoneLabels[decision.targetZone] ?? 'court';
  const description = rallyEnds
    ? (shotSuccess
      ? `${actionLabel} to ${zone} — WINNER! Rally of ${gameState.rallyLength + 1} shots.`
      : `${actionLabel} goes wide — point to opponent after ${gameState.rallyLength + 1}-shot rally.`)
    : `${actionLabel} to ${zone} — rally continues (shot ${gameState.rallyLength + 1})`;

  // Clear trainer command after it has been used
  const newTrainerCommands = { ...gameState.trainerCommands };
  newTrainerCommands[responderId] = null;

  const newGameState: GameState = {
    ...gameState,
    sets: newSets,
    currentSet: newCurrentSet,
    shuttlePosition: newShuttlePos,
    agentPositions: newAgentPositions,
    momentum: newMomentum,
    lastAction: decision.action,
    rallyLength: rallyEnds ? 0 : gameState.rallyLength + 1,
    rallyCount: gameState.rallyCount + (rallyEnds ? 1 : 0),
    servingAgentId: rallyEnds ? pointWinnerId : gameState.servingAgentId,
    trainerCommands: newTrainerCommands,
    matchOver,
    winner,
  };

  return {
    pointWinnerId: rallyEnds ? pointWinnerId : '',
    action: decision.action,
    description,
    rallyLength: gameState.rallyLength + 1,
    successRate: successProb,
    momentumShift: newMomentum,
    newGameState,
    matchOver,
    setOver,
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
      if (i >= gameState.currentSet) return false;
      const vals = Object.values(s.agentScores);
      return s.agentScores[agentId] === Math.max(...vals) && Math.max(...vals) > 0;
    }).length;

  return {
    sets,
    current: sets[gameState.currentSet] ?? { a1: 0, a2: 0 },
    setsWon: { a1: countSetsWon(agentIds[0]), a2: countSetsWon(agentIds[1]) },
  };
}
