/**
 * Badminton Game Engine — physics-driven, stats-based simulation
 *
 * Core mechanic:
 *  shuttleHeight (0–3) tracks where the shuttle is when the player hits it.
 *  Each shot produces a specific height for the opponent:
 *    CLEAR / LOB  → 3.0  (overhead opportunity for opponent)
 *    SMASH        → 0.2  (fast downward, receiver gets it near ground)
 *    DROP         → 0.4  (gentle net drop, receiver at forecourt)
 *    DRIVE        → 1.2  (flat mid-height exchange)
 *    BLOCK        → 0.8  (soft net return, mid-low)
 *    SERVE        → 2.0  (standard service height)
 *    SPECIAL      → 0.1  (signature power move, very low for receiver)
 *
 *  Stats drive every probability:
 *    power    → smash damage / special move effectiveness
 *    accuracy → drop/drive placement, reduced scatter
 *    speed    → defensive reach, cover more court
 *    stamina  → fatigue resistance, late-rally performance
 */

export type SportAction =
  | 'SERVE'
  | 'SMASH'
  | 'DROP'
  | 'CLEAR'
  | 'DRIVE'
  | 'LOB'
  | 'BLOCK'
  | 'SPECIAL';

export type BadmintonStats = {
  speed:    number; // 1–10
  power:    number;
  stamina:  number;
  accuracy: number;
  archetype?: string;
};

export type GameState = {
  sport: 'badminton';
  servingAgentId: string;
  rallyCount: number;
  currentSet: number;
  sets: { agentScores: Record<string, number> }[];
  shuttlePosition: { x: number; y: number };
  shuttleHeight: number;       // 0 = ground/net, 1 = mid, 2 = high, 3 = overhead
  agentPositions: Record<string, { x: number; y: number }>;
  momentum: Record<string, number>;     // 0–100
  fatigue:  Record<string, number>;     // 0–100, 0=fresh 100=exhausted
  lastAction: string;
  lastAgentId: string;
  rallyLength: number;
  trainerCommands: Record<string, string | null>;
  preComputedDecisions?: Record<string, any>;
  matchOver: boolean;
  winner?: string;
};

export type ShotDecision = {
  action: SportAction;
  targetZone: number;   // 1–9
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
  isWinner: boolean;
};

// ── Badminton scoring ──────────────────────────────────────────────────────────
const SCORING = { pointsPerSet: 21, setsToWin: 2, totalSets: 3, deuceAt: 20, maxPoints: 30 };

// ── Zone landing positions — RELATIVE to defender's court ─────────────────────
// These are y-offsets within the defender's half (0 = net, 45 = baseline).
// getZonePos() flips them based on who is defending.
// Court: y=0 top, y=50 net, y=100 bottom.
//   Agent A (a1) owns y=50–100 (bottom half)
//   Agent B (a2) owns y=0–50  (top half)
const ZONE_GRID: { x: number; dy: number }[] = [
  { x: 50, dy: 0  }, // 0: sentinel (net)
  { x: 15, dy: 40 }, // 1: deep back-left (defender's baseline)
  { x: 50, dy: 40 }, // 2: deep back-center
  { x: 85, dy: 40 }, // 3: deep back-right
  { x: 15, dy: 20 }, // 4: mid-left
  { x: 50, dy: 20 }, // 5: center
  { x: 85, dy: 20 }, // 6: mid-right
  { x: 20, dy: 5  }, // 7: front-left (near net, tight drop)
  { x: 50, dy: 5  }, // 8: front-center (near net)
  { x: 80, dy: 5  }, // 9: front-right (near net)
];

/**
 * Convert zone grid to absolute court position based on who's DEFENDING.
 * Shuttle always lands in the DEFENDER's half of the court.
 */
function getZonePos(zone: number, defenderIsA1: boolean): { x: number; y: number } {
  const z = ZONE_GRID[zone] ?? ZONE_GRID[0];
  if (defenderIsA1) {
    // Defender is A1 (bottom half, y=50–100): near net = y~55, baseline = y~95
    return { x: z.x, y: 52 + z.dy };
  } else {
    // Defender is A2 (top half, y=0–50): near net = y~45, baseline = y~5
    return { x: z.x, y: 48 - z.dy };
  }
}

// ── Half-court clamp helpers ──────────────────────────────────────────────────
/** Clamp position to a player's own half of the court */
function clampToHalf(pos: { x: number; y: number }, isA1: boolean): { x: number; y: number } {
  return {
    x: Math.max(5, Math.min(95, pos.x)),
    y: isA1
      ? Math.max(52, Math.min(97, pos.y))   // A1: bottom half (52–97)
      : Math.max(3,  Math.min(48, pos.y)),   // A2: top half (3–48)
  };
}

// ── Shuttle height produced by each shot (what opponent receives) ─────────────
const RESULT_HEIGHT: Record<SportAction, number> = {
  CLEAR:   3.0,  // high deep — overhead opportunity for opponent
  LOB:     2.8,  // high lift — same
  SERVE:   2.0,  // standard service
  DROP:    0.4,  // falls near net — receiver must rush forecourt
  SMASH:   0.2,  // fast downward — almost at ground for receiver
  DRIVE:   1.2,  // flat mid-height exchange
  BLOCK:   0.8,  // gentle net return
  SPECIAL: 0.1,  // power kill — nearly impossible height for receiver
};

// ── Stamina cost per shot (badminton is exhausting) ───────────────────────────
const FATIGUE_COST: Record<SportAction, number> = {
  SMASH:   10,
  SPECIAL: 14,
  DRIVE:    6,
  CLEAR:    5,
  LOB:      4,
  DROP:     3,
  BLOCK:    3,
  SERVE:    1,
};

// ── Court distance helper ─────────────────────────────────────────────────────
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── Attack success probability ────────────────────────────────────────────────
// Returns probability [0,1] that the attacker executes this shot successfully.
// Core insight: you can't smash a shuttle that's near the ground — physics won't let you.
function attackSuccessProb(
  action: SportAction,
  stats: BadmintonStats,
  shuttleHeight: number,
  momentum: number,
  fatigue: number,
  distToShuttle: number,
): number {
  // Base probability driven by shuttle height at contact
  let base: number;
  switch (action) {
    case 'SMASH':
      // Smash requires overhead shuttle — failure below waist is near-certain
      if (shuttleHeight >= 2.5) base = 0.72;
      else if (shuttleHeight >= 2.0) base = 0.60;
      else if (shuttleHeight >= 1.5) base = 0.38;
      else if (shuttleHeight >= 1.0) base = 0.20;
      else base = 0.07; // literally can't smash a shuttle near the floor
      break;

    case 'DROP':
      // Overhead drop - needs height for deception
      if (shuttleHeight >= 2.0) base = 0.76;
      else if (shuttleHeight >= 1.5) base = 0.68;
      else if (shuttleHeight >= 1.0) base = 0.56;
      else base = 0.38;
      break;

    case 'CLEAR':
      // Most reliable shot, works from almost any height
      if (shuttleHeight >= 1.5) base = 0.90;
      else if (shuttleHeight >= 0.5) base = 0.85;
      else base = 0.78; // clearing from below net is hard
      break;

    case 'LOB':
      // Lift from low position — natural when shuttle is below waist
      if (shuttleHeight <= 0.8) base = 0.86;
      else if (shuttleHeight <= 1.5) base = 0.80;
      else base = 0.65; // lobbing an overhead shuttle is awkward
      break;

    case 'DRIVE':
      // Flat drive best at mid height
      if (shuttleHeight >= 0.8 && shuttleHeight <= 1.6) base = 0.74;
      else if (shuttleHeight <= 0.8) base = 0.60;
      else base = 0.58; // high drive is awkward
      break;

    case 'BLOCK':
      // Net shot / block best when shuttle is at net level
      if (shuttleHeight <= 0.8) base = 0.80;
      else if (shuttleHeight <= 1.4) base = 0.70;
      else base = 0.58;
      break;

    case 'SERVE':
      base = 0.96;
      break;

    case 'SPECIAL':
      // Signature move — needs height to execute properly
      if (shuttleHeight >= 2.0) base = 0.64;
      else if (shuttleHeight >= 1.0) base = 0.46;
      else base = 0.30;
      break;

    default:
      base = 0.70;
  }

  // Stat modifier — stats have significant impact
  const statMod =
    action === 'SMASH'   ? (stats.power    - 5) / 30 :  // ±0.17
    action === 'SPECIAL' ? (Math.max(stats.power, stats.accuracy) - 5) / 35 :
    action === 'DROP'    ? (stats.accuracy - 5) / 35 :  // ±0.14
    action === 'DRIVE'   ? (stats.speed    - 5) / 35 :
    action === 'BLOCK'   ? (stats.speed    - 5) / 40 :
    action === 'CLEAR'   ? (stats.stamina  - 5) / 50 :
    action === 'LOB'     ? (stats.stamina  - 5) / 60 :
    0;

  // Momentum bonus: hot streak makes every shot better
  const momentumBonus = (momentum - 50) / 400; // ±0.125

  // Fatigue penalty: tired players mis-hit shots
  const fatiguePenalty = (fatigue / 100) * 0.25; // up to -0.25

  // Reach penalty: if attacker ran far to reach shuttle, shot quality drops
  // Fast players cover distance without penalty
  const reachPenalty = distToShuttle > 20
    ? ((distToShuttle - 20) / 80) * Math.max(0.1, 1 - stats.speed / 14)
    : 0;

  return Math.min(0.95, Math.max(0.06,
    base + statMod + momentumBonus - fatiguePenalty - reachPenalty
  ));
}

// ── Defense (return) probability ──────────────────────────────────────────────
// Can the defender physically reach and return the shot?
// Shuttle height BEFORE the shot (attacker's height) determines shot quality.
function defenseReturnProb(
  attackAction: SportAction,
  attackShuttleHeight: number,
  targetZone: number,
  defenderPos: { x: number; y: number },
  defenderStats: BadmintonStats,
  defenderMomentum: number,
  defenderFatigue: number,
  rallyLength: number,
): number {
  // How hard this shot type is to defend — depends on how well the smash was hit
  let baseDifficulty: number;
  switch (attackAction) {
    case 'SMASH': {
      // Smash is hard to return but not automatic — good defenders return ~50-60%
      // Higher shuttle = better smash quality = harder to defend
      const smashQuality = Math.min(1.0, attackShuttleHeight / 3.0);
      baseDifficulty = 0.42 + (1 - smashQuality) * 0.18; // 0.42 (perfect smash) to 0.60 (weak smash)
      break;
    }
    case 'SPECIAL':
      baseDifficulty = 0.30; // signature moves are hard but not instant kills
      break;
    case 'DROP':
      baseDifficulty = 0.52; // requires quick net movement but defenders anticipate
      break;
    case 'DRIVE':
      baseDifficulty = 0.58; // fast but predictable trajectory
      break;
    case 'LOB':
    case 'CLEAR':
      baseDifficulty = 0.85; // high and slow — easy to prepare
      break;
    case 'BLOCK':
      baseDifficulty = 0.65; // net return, tricky but reachable
      break;
    case 'SERVE':
      baseDifficulty = 0.90; // almost always returned
      break;
    default:
      baseDifficulty = 0.60;
  }

  // Distance the defender must cover (use grid offsets — direction doesn't matter for distance)
  const zg = ZONE_GRID[Math.max(1, Math.min(9, targetZone))] ?? ZONE_GRID[5];
  // Approximate landing in defender's half: x from grid, y as offset from defender's baseline
  const landingPos = { x: zg.x, y: defenderPos.y > 50 ? 52 + zg.dy : 48 - zg.dy };
  const distToLanding = dist(defenderPos, landingPos);

  // Reach penalty: fast players can cover the court; slow players get exposed
  // SMASH/SPECIAL: shuttle is fast, so distance matters MORE
  const speedFactor = Math.max(0.05, 1 - defenderStats.speed / 12);
  const distWeight = attackAction === 'SMASH' || attackAction === 'SPECIAL' ? 0.16 : 0.10;
  const reachPenalty = (distToLanding / 10) * speedFactor * distWeight;

  // Stat bonuses for defense — higher impact so skilled defenders shine
  const speedBonus    = (defenderStats.speed    - 5) / 30;  // ±0.17
  const reflexBonus   = (defenderStats.accuracy - 5) / 50;  // ±0.10
  const momentumBonus = (defenderMomentum - 50) / 350;      // ±0.14

  // Fatigue: very tired players can't spring to the shuttle
  const fatiguePenalty = (defenderFatigue / 100) * 0.22;

  return Math.min(0.94, Math.max(0.08,
    baseDifficulty + speedBonus + reflexBonus + momentumBonus
    - reachPenalty - fatiguePenalty
  ));
}

// ── Initialize game state ──────────────────────────────────────────────────────
export function initGameState(
  sport: 'badminton',
  agentIds: string[],
  servingFirst?: string,
): GameState {
  return {
    sport: 'badminton',
    servingAgentId: servingFirst ?? agentIds[0],
    rallyCount: 0,
    currentSet: 0,
    sets: [{ agentScores: Object.fromEntries(agentIds.map(id => [id, 0])) }],
    shuttlePosition: { x: 50, y: 50 },
    shuttleHeight: 2.0, // start at service height
    agentPositions: Object.fromEntries(
      agentIds.map((id, i) => [id, { x: 50, y: i === 0 ? 75 : 25 }])
    ),
    momentum: Object.fromEntries(agentIds.map(id => [id, 50])),
    fatigue:  Object.fromEntries(agentIds.map(id => [id, 0])),
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
  agentStats: Record<string, BadmintonStats>,
): RallyResult {
  const agentIds = Object.keys(agentStats);
  const [a1, a2] = agentIds;

  // Who hits this exchange (alternates each shot within the rally)
  const attackerId = gameState.rallyLength % 2 === 0
    ? gameState.servingAgentId
    : agentIds.find(id => id !== gameState.servingAgentId)!;
  const defenderId = agentIds.find(id => id !== attackerId)!;

  const attackDecision  = decisions[attackerId] ?? { action: 'CLEAR' as SportAction, targetZone: 2, rationale: 'fallback' };
  const attackStats     = agentStats[attackerId];
  const defenderStats   = agentStats[defenderId];
  const attackMomentum  = gameState.momentum[attackerId]  ?? 50;
  const defenderMomentum = gameState.momentum[defenderId] ?? 50;
  const attackFatigue   = gameState.fatigue[attackerId]   ?? 0;
  const defenderFatigue = gameState.fatigue[defenderId]   ?? 0;

  // Current shuttle height when attacker hits it
  const currentHeight = gameState.shuttleHeight ?? 2.0;

  // How far did the attacker have to run?
  const attackerPos   = gameState.agentPositions[attackerId] ?? { x: 50, y: 50 };
  const defenderPos   = gameState.agentPositions[defenderId] ?? { x: 50, y: 50 };
  const distToShuttle = dist(attackerPos, gameState.shuttlePosition);

  // Step 1: Can the attacker execute this shot given the shuttle height?
  const attackProb = attackSuccessProb(
    attackDecision.action, attackStats, currentHeight,
    attackMomentum, attackFatigue, distToShuttle,
  );
  const attackSuccess = Math.random() < attackProb;

  // Step 2: If shot is executed, can the defender physically return it?
  const defenseProb = attackSuccess
    ? defenseReturnProb(
        attackDecision.action, currentHeight,
        attackDecision.targetZone,
        defenderPos, defenderStats,
        defenderMomentum, defenderFatigue,
        gameState.rallyLength,
      )
    : 1; // attack failed, defender wins by default
  const defenseSuccess = attackSuccess ? Math.random() < defenseProb : true;

  const isSpecial   = attackDecision.action === 'SPECIAL';
  const specialCost = isSpecial ? 18 : 0;

  // ── Determine outcome ────────────────────────────────────────────────────
  let pointWinnerId = '';
  let loserId       = '';
  let rallyEnds     = false;

  if (!attackSuccess) {
    rallyEnds     = true;
    pointWinnerId = defenderId;
    loserId       = attackerId;
  } else if (!defenseSuccess) {
    rallyEnds     = true;
    pointWinnerId = attackerId;
    loserId       = defenderId;
  } else {
    rallyEnds = false;
    // Stamina collapse: very long rallies — higher stamina player wins
    if (gameState.rallyLength >= 22) {
      rallyEnds     = true;
      const a1Score = agentStats[a1].stamina - (gameState.fatigue[a1] ?? 0) / 12;
      const a2Score = agentStats[a2].stamina - (gameState.fatigue[a2] ?? 0) / 12;
      pointWinnerId = a1Score >= a2Score ? a1 : a2;
      loserId       = agentIds.find(id => id !== pointWinnerId)!;
    }
  }

  // ── Update scores ────────────────────────────────────────────────────────
  const newSets = gameState.sets.map(s => ({
    ...s, agentScores: { ...s.agentScores },
  }));
  let setOver      = false;
  let newCurrentSet = gameState.currentSet;
  let matchOver    = false;
  let winner: string | undefined;

  if (rallyEnds && pointWinnerId) {
    const scores = newSets[gameState.currentSet].agentScores;
    scores[pointWinnerId] = (scores[pointWinnerId] ?? 0) + 1;
    const myScore  = scores[pointWinnerId];
    const oppScore = scores[loserId] ?? 0;
    const wonSet   = myScore >= SCORING.pointsPerSet &&
                     (myScore - oppScore >= 2 || myScore >= SCORING.maxPoints);

    if (wonSet) {
      setOver = true;
      const setsWon = newSets.filter((s, i) => {
        if (i > newCurrentSet) return false;
        const vals = Object.values(s.agentScores);
        return s.agentScores[pointWinnerId] === Math.max(...vals) && Math.max(...vals) > 0;
      }).length;

      if (setsWon >= SCORING.setsToWin) {
        matchOver = true;
        winner    = pointWinnerId;
      } else {
        newCurrentSet++;
        newSets.push({ agentScores: Object.fromEntries(agentIds.map(id => [id, 0])) });
      }
    }
  }

  // ── Update momentum ──────────────────────────────────────────────────────
  const newMomentum = { ...gameState.momentum };
  if (rallyEnds && pointWinnerId) {
    newMomentum[pointWinnerId] = Math.min(88, newMomentum[pointWinnerId] + 6);
    newMomentum[loserId]       = Math.max(18, newMomentum[loserId] - 5);
    // Comeback mechanic: trailing player gets a push
    const scores = newSets[gameState.currentSet].agentScores;
    const gap    = (scores[pointWinnerId] ?? 0) - (scores[loserId] ?? 0);
    if (gap > 4) newMomentum[loserId] = Math.min(52, newMomentum[loserId] + 4);
    if (isSpecial) newMomentum[attackerId] = Math.max(15, newMomentum[attackerId] - specialCost);
  }

  // ── Update fatigue ────────────────────────────────────────────────────────
  const newFatigue = { ...gameState.fatigue };
  const shotCost   = FATIGUE_COST[attackDecision.action] ?? 5;
  // Stamina reduces fatigue accumulation (high-stamina player recovers faster)
  const fatigueGain = shotCost * Math.max(0.3, 1.2 - attackStats.stamina / 10);
  newFatigue[attackerId] = Math.min(100, (newFatigue[attackerId] ?? 0) + fatigueGain);
  // Defender also burns some energy moving to chase the shuttle
  const chaseExertion = (attackDecision.action === 'SMASH' || attackDecision.action === 'SPECIAL') ? 5 : 2;
  newFatigue[defenderId] = Math.min(100, (newFatigue[defenderId] ?? 0) + chaseExertion * Math.max(0.3, 1.2 - defenderStats.stamina / 10));

  // Passive micro-recovery within rallies: every 4th shot, high-stamina players recover slightly
  if (!rallyEnds && gameState.rallyLength > 0 && gameState.rallyLength % 4 === 0) {
    for (const id of agentIds) {
      const microRecovery = agentStats[id].stamina * 0.4;
      newFatigue[id] = Math.max(0, (newFatigue[id] ?? 0) - microRecovery);
    }
  }

  // Between points: fatigue partially recovers
  if (rallyEnds) {
    for (const id of agentIds) {
      const recovery = 12 + (agentStats[id].stamina - 5) * 1.5;
      newFatigue[id] = Math.max(0, (newFatigue[id] ?? 0) - recovery);
    }
  }

  // ── New shuttle height for next exchange ─────────────────────────────────
  const newShuttleHeight = rallyEnds ? 2.0 : (RESULT_HEIGHT[attackDecision.action] ?? 1.5);

  // ── Shuttle position with accuracy-based scatter ──────────────────────────
  const zone = Math.max(1, Math.min(9, attackDecision.targetZone));
  const defenderIsA1 = defenderId === a1;
  const zoneLanding = getZonePos(zone, defenderIsA1);
  // accuracy 10 → scatter 3 (tight placement), accuracy 1 → scatter 18 (wild)
  const scatter = Math.max(3, 20 - attackStats.accuracy * 2);
  const rawShuttlePos = {
    x: zoneLanding.x + (Math.random() - 0.5) * scatter,
    y: rallyEnds ? 50 : zoneLanding.y + (Math.random() - 0.5) * scatter,
  };
  // Shuttle always lands in DEFENDER's half (never crosses back to attacker's side)
  const newShuttlePos = rallyEnds
    ? { x: 50, y: 50 }
    : clampToHalf(rawShuttlePos, defenderIsA1);

  // ── Agent movement (HALF-COURT ENFORCED) ──────────────────────────────────
  const newPositions = { ...gameState.agentPositions };
  const attackerIsA1 = attackerId === a1;

  // After their shot, attacker recovers toward T-position (center of own half)
  const tPos = { x: 50, y: attackerIsA1 ? 72 : 28 };
  const rawAttackerPos = {
    x: attackerPos.x + (tPos.x - attackerPos.x) * 0.45 + (Math.random() - 0.5) * 8,
    y: attackerPos.y + (tPos.y - attackerPos.y) * 0.45,
  };
  newPositions[attackerId] = clampToHalf(rawAttackerPos, attackerIsA1);

  if (!rallyEnds) {
    // Defender sprints toward shuttle in own half; speed determines coverage
    const coverage = Math.min(0.98, defenderStats.speed / 8.0);
    const defenderTgt = {
      x: newShuttlePos.x + (defenderPos.x - newShuttlePos.x) * (1 - coverage),
      y: newShuttlePos.y + (defenderPos.y - newShuttlePos.y) * (1 - coverage),
    };
    const rawDefenderPos = {
      x: defenderTgt.x + (Math.random() - 0.5) * 7,
      y: defenderTgt.y + (Math.random() - 0.5) * 7,
    };
    // CRITICAL: defender stays in own half — never crosses the net
    newPositions[defenderId] = clampToHalf(rawDefenderPos, defenderIsA1);
  } else {
    // Reset both to T-positions after the point
    newPositions[a1] = { x: 50, y: 72 };
    newPositions[a2] = { x: 50, y: 28 };
  }

  // ── Description ──────────────────────────────────────────────────────────
  const actionLabel = isSpecial && attackDecision.specialMove
    ? `✨ ${attackDecision.specialMove}`
    : badmintonShotLabel(attackDecision.action, currentHeight);
  const zones = ['','deep L','deep C','deep R','mid-L','center','mid-R','net-L','net-C','net-R'];
  const zoneName = zones[attackDecision.targetZone] ?? 'court';

  let description: string;
  if (!rallyEnds) {
    description = `${actionLabel} → ${zoneName} (rally: ${gameState.rallyLength + 1} shots)`;
  } else if (pointWinnerId === attackerId) {
    description = `${actionLabel} to ${zoneName} — WINNER! ${gameState.rallyLength + 1}-shot rally`;
  } else {
    description = `${actionLabel} → ${zoneName} — FAULT! ${gameState.rallyLength + 1}-shot rally`;
  }

  // ── Trainer commands consumed ─────────────────────────────────────────────
  const newTrainerCommands = { ...gameState.trainerCommands };
  newTrainerCommands[attackerId] = null;

  const newGameState: GameState = {
    ...gameState,
    sets: newSets,
    currentSet: newCurrentSet,
    shuttlePosition: newShuttlePos,
    shuttleHeight: newShuttleHeight,
    agentPositions: newPositions,
    momentum: newMomentum,
    fatigue: newFatigue,
    lastAction: attackDecision.action,
    lastAgentId: attackerId,
    rallyLength:  rallyEnds ? 0 : gameState.rallyLength + 1,
    rallyCount:   gameState.rallyCount + (rallyEnds ? 1 : 0),
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

// ── Badminton shot label with height context ───────────────────────────────────
function badmintonShotLabel(action: SportAction, height: number): string {
  switch (action) {
    case 'SMASH':  return height >= 2.5 ? 'Power Smash' : height >= 2.0 ? 'Overhead Smash' : 'Rushed Smash';
    case 'DROP':   return height >= 2.0 ? 'Deceptive Drop' : 'Forced Drop';
    case 'CLEAR':  return height >= 1.5 ? 'Defensive Clear' : 'Low Clear';
    case 'LOB':    return 'Lob Lift';
    case 'DRIVE':  return 'Flat Drive';
    case 'BLOCK':  return height <= 0.8 ? 'Net Kill' : 'Block Return';
    case 'SERVE':  return 'Service';
    case 'SPECIAL': return 'Signature Move';
    default: return action;
  }
}

// ── Score display helper ─────────────────────────────────────────────────────
export function getScoreDisplay(
  gameState: GameState,
  agentIds: [string, string],
): { sets: { a1: number; a2: number }[]; current: { a1: number; a2: number }; setsWon: { a1: number; a2: number } } {
  const sets = gameState.sets.map(s => ({
    a1: s.agentScores[agentIds[0]] ?? 0,
    a2: s.agentScores[agentIds[1]] ?? 0,
  }));

  const countSetsWon = (id: string) =>
    gameState.sets.filter((s, i) => {
      if (i >= gameState.currentSet && !gameState.matchOver) return false;
      const vals = Object.values(s.agentScores);
      return s.agentScores[id] === Math.max(...vals) && Math.max(...vals) > 0;
    }).length;

  return {
    sets,
    current: sets[gameState.currentSet] ?? { a1: 0, a2: 0 },
    setsWon: { a1: countSetsWon(agentIds[0]), a2: countSetsWon(agentIds[1]) },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH RALLY — compute entire rally in one call for smooth client-side playback
// ═══════════════════════════════════════════════════════════════════════════════

/** Timing in ms for each shot type — how long the animation should take.
 *  Tightened for fast-paced gameplay feel. A 10-shot rally = ~3.5s total. */
export const SHOT_TIMING: Record<string, number> = {
  SERVE:   600,
  SMASH:   250,
  DROP:    380,
  CLEAR:   450,
  LOB:     480,
  DRIVE:   280,
  BLOCK:   300,
  SPECIAL: 350,
};

/** One frame in a rally animation sequence */
export type RallyFrame = {
  /** Sequential index (0 = first shot) */
  index: number;
  /** Who hit the shuttle */
  attackerId: string;
  /** Shot type */
  action: SportAction;
  /** Human-readable description */
  description: string;
  /** How long this shot's animation should take (ms) */
  durationMs: number;
  /** Agent positions AFTER this shot */
  agentPositions: Record<string, { x: number; y: number }>;
  /** Shuttle position AFTER this shot */
  shuttlePosition: { x: number; y: number };
  /** Momentum per agent */
  momentum: Record<string, number>;
  /** Fatigue per agent */
  fatigue: Record<string, number>;
  /** Did this shot score a point? */
  pointWon: boolean;
  /** Who won the point (if pointWon) */
  pointWinnerId: string | null;
  /** Special move name (if SPECIAL) */
  specialMove?: string | null;
};

/** Result of a full batch rally computation */
export type BatchRallyResult = {
  /** Ordered sequence of shots to animate */
  frames: RallyFrame[];
  /** Final game state after the entire rally */
  finalGameState: GameState;
  /** Did the match end? */
  matchOver: boolean;
  /** Did a set end? */
  setOver: boolean;
  /** Who won the point */
  pointWinnerId: string;
  /** Total shots in this rally */
  totalShots: number;
};

/**
 * Compute an entire rally from serve to point-scored.
 * Returns a sequence of RallyFrames that the client can animate at game speed.
 *
 * @param gameState - Current game state (should be at start of a rally, rallyLength=0)
 * @param agentStats - Stats for both agents
 * @param decisionFn - Function that returns shot decisions for each agent given current state.
 *                     Called once per shot exchange. For AI agents, this should call the LLM.
 *                     For pre-computed decisions, return from a queue.
 * @param maxShots - Safety cap to prevent infinite rallies (default 30)
 */
export async function resolveFullRally(
  gameState: GameState,
  agentStats: Record<string, BadmintonStats>,
  decisionFn: (state: GameState, attackerId: string) => Promise<ShotDecision>,
  maxShots = 30,
): Promise<BatchRallyResult> {
  const frames: RallyFrame[] = [];
  let state = { ...gameState };
  const agentIds = Object.keys(state.agentPositions);
  let shotIndex = 0;
  let pointScored = false;
  let matchOver = false;
  let setOver = false;
  let pointWinnerId = '';

  while (!pointScored && shotIndex < maxShots) {
    // Determine who's attacking this exchange
    // In a rally: alternates. First shot = server. After that, the defender becomes attacker.
    const attackerId = shotIndex === 0
      ? state.servingAgentId
      : (state.lastAgentId === agentIds[0] ? agentIds[1] : agentIds[0]);
    const defenderId = agentIds.find(id => id !== attackerId)!;

    // Get decision for the attacking agent
    const decision = await decisionFn(state, attackerId);

    // Build decisions map (defender's decision doesn't matter for resolveRally)
    const decisions: Record<string, ShotDecision> = {
      [attackerId]: decision,
      [defenderId]: { action: 'BLOCK', targetZone: 5, rationale: 'defending' },
    };

    // Resolve this single exchange
    const result = resolveRally(state, decisions, agentStats);

    // Build animation frame
    const frame: RallyFrame = {
      index: shotIndex,
      attackerId,
      action: decision.action,
      description: result.description,
      durationMs: SHOT_TIMING[decision.action] ?? 500,
      agentPositions: result.newGameState.agentPositions,
      shuttlePosition: result.newGameState.shuttlePosition,
      momentum: result.newGameState.momentum,
      fatigue: { ...result.newGameState.fatigue },
      pointWon: result.isWinner,
      pointWinnerId: result.pointWinnerId || null,
      specialMove: decision.specialMove,
    };
    frames.push(frame);

    // Update state for next exchange
    state = result.newGameState;
    shotIndex++;

    if (result.isWinner) {
      pointScored = true;
      pointWinnerId = result.pointWinnerId;
      matchOver = result.matchOver;
      setOver = result.setOver;
    }
  }

  // Safety: if we hit maxShots without a point, force a point for the serving player
  if (!pointScored && frames.length > 0) {
    pointWinnerId = state.servingAgentId;
  }

  return {
    frames,
    finalGameState: state,
    matchOver,
    setOver,
    pointWinnerId,
    totalShots: frames.length,
  };
}
