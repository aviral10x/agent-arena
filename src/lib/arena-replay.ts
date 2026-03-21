import { getAgentName, getCompetition, tradeFeed } from "@/lib/arena-data";
import type { Competition, TradeEvent } from "@/lib/arena-data";

export type ArenaVector3 = {
  x: number;
  y: number;
  z: number;
};

export type ReplayTimerMode = "countdown" | "elapsed";

export type ReplayMeta = {
  competitionId: string;
  title: string;
  mode: Competition["mode"];
  status: Competition["status"];
  roundLabel: string;
  prizeLabel: string;
  blockNumberSeed: number;
  timerMode: ReplayTimerMode;
  timerSeconds: number;
  liveStateLabel: string;
};

export type ReplayTradeEvent = {
  id: string;
  agentId: string;
  agentName: string;
  side: TradeEvent["type"];
  pair: string;
  amount: string;
  rationale: string;
  timeLabel: string;
  impactPct: number;
  impactLabel: string;
  isPositive: boolean;
  blockNumber: number;
  heat: number;
};

export type ReplayAgentState = {
  id: string;
  name: string;
  color: string;
  archetype: string;
  portfolio: number;
  pnl: number;
  trades: number;
  score: number;
  hp: number;
  hpMax: number;
  xp: number;
  xpMax: number;
  level: number;
  streak: number;
  actionSeed: string;
  actionLabel: string;
  positionHint: ArenaVector3;
  orbitSlot: number;
  heat: number;
  shieldPercent: number;
  xpPercent: number;
  signalLabel: string;
};

export type ReplayLeaderboardRow = {
  rank: number;
  agentId: string;
  name: string;
  pnl: number;
  portfolio: number;
  score: number;
  streak: number;
  hp: number;
};

export type ArenaReplayState = {
  meta: ReplayMeta;
  leaderboard: ReplayLeaderboardRow[];
  agents: ReplayAgentState[];
  trades: ReplayTradeEvent[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function positiveMod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${round1(value)}%`;
}

function parseCountdownSeconds(label: string) {
  const trimmed = label.trim().toLowerCase();
  const timeMatch = trimmed.match(/(\d+):(\d+)(?::(\d+))?/);

  if (timeMatch) {
    const hours = timeMatch[3] ? Number(timeMatch[1]) : 0;
    const minutes = timeMatch[3] ? Number(timeMatch[2]) : Number(timeMatch[1]);
    const seconds = timeMatch[3] ? Number(timeMatch[3]) : Number(timeMatch[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }

  const minutesMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*min/);
  if (minutesMatch) {
    return Math.round(Number(minutesMatch[1]) * 60);
  }

  const secondsMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*sec/);
  if (secondsMatch) {
    return Math.round(Number(secondsMatch[1]));
  }

  return 0;
}

function getTimerMode(label: string): ReplayTimerMode {
  return label.toLowerCase().includes("ago") ? "elapsed" : "countdown";
}

function formatRoundLabel(id: string, mode: Competition["mode"]) {
  const numeric = Number.parseInt(id.replace(/\D/g, ""), 10);
  const round = Number.isFinite(numeric) && numeric > 0 ? String(numeric).padStart(2, "0") : "01";
  return `${mode.toUpperCase()} ROUND ${round}`;
}

function deriveBlockNumberSeed(competition: Competition, tradeEvents: TradeEvent[]) {
  return 4_820_000 + positiveMod(hashString(`${competition.id}:${competition.title}:${tradeEvents.length}`), 50_000);
}

function deriveActionLabel(agent: Competition["agents"][number], tradeEvents: TradeEvent[]) {
  const lastEvent = [...tradeEvents].reverse().find((event) => event.agentId === agent.id);
  if (lastEvent) {
    return `${lastEvent.type} ${lastEvent.pair}`;
  }
  return agent.strategy;
}

function derivePositionHint(index: number, total: number, agent: Competition["agents"][number]) {
  const angle = total > 0 ? (index / total) * Math.PI * 2 - Math.PI / 2 : 0;
  const radius = total > 2 ? 5.2 : 4.2;
  const scoreBoost = clamp((agent.score - 75) / 30, -1.2, 1.2);
  const pnlBoost = clamp(agent.pnl / 8, -1.2, 1.2);
  const y = 1.2 + scoreBoost * 0.6 + pnlBoost * 0.8;

  return {
    x: round2(Math.cos(angle) * radius),
    y: round2(y),
    z: round2(Math.sin(angle) * radius),
  };
}

function deriveHp(agent: Competition["agents"][number]) {
  const raw = 62 + agent.pnl * 4.5 + (agent.score - 80) * 0.4 + (agent.portfolio - 10) * 18;
  return Math.round(clamp(raw, 8, 100));
}

function deriveXp(agent: Competition["agents"][number]) {
  const raw = agent.trades * 8 + Math.max(agent.pnl, 0) * 7 + (agent.score - 60) * 0.5;
  return Math.round(clamp(raw, 0, 100));
}

function deriveStreak(agent: Competition["agents"][number]) {
  const seed = Math.max(1, Math.round(Math.abs(agent.pnl) * 1.4 + agent.trades / 3));
  return agent.pnl >= 0 ? seed : -seed;
}

function deriveHeat(agent: Competition["agents"][number], rank: number) {
  const base = 35 + agent.score * 0.4 + Math.abs(agent.pnl) * 4 + agent.trades * 1.5 - rank * 3;
  return Math.round(clamp(base, 10, 100));
}

function deriveSignalLabel(agent: Competition["agents"][number], streak: number) {
  const direction = agent.pnl >= 0 ? "PUMP" : "DEFEND";
  const cadence = streak >= 0 ? "HOT" : "UNDER PRESSURE";
  return `${direction} / ${cadence}`;
}

function normalizeTradeEvent(
  event: TradeEvent,
  index: number,
  blockSeed: number,
  competition: Competition,
): ReplayTradeEvent {
  const impactPct = Number.parseFloat(event.priceImpact.replace("%", ""));
  const hash = hashString(`${event.id}:${event.agentId}:${competition.id}`);
  const heat = Math.round(clamp(50 + Math.abs(impactPct) * 12 + positiveMod(hash, 18), 10, 100));

  return {
    id: event.id,
    agentId: event.agentId,
    agentName: getAgentName(event.agentId),
    side: event.type,
    pair: event.pair,
    amount: event.amount,
    rationale: event.rationale,
    timeLabel: event.time,
    impactPct,
    impactLabel: formatSignedPercent(impactPct),
    isPositive: impactPct >= 0,
    blockNumber: blockSeed + index * 3,
    heat,
  };
}

export function buildArenaReplayState(
  competition: Competition,
  events: TradeEvent[] = tradeFeed,
): ArenaReplayState {
  const blockNumberSeed = deriveBlockNumberSeed(competition, events);
  const meta: ReplayMeta = {
    competitionId: competition.id,
    title: competition.title,
    mode: competition.mode,
    status: competition.status,
    roundLabel: formatRoundLabel(competition.id, competition.mode),
    prizeLabel: competition.prizePool,
    blockNumberSeed,
    timerMode: getTimerMode(competition.countdown),
    timerSeconds: parseCountdownSeconds(competition.countdown),
    liveStateLabel: competition.status === "live" ? "LIVE" : competition.status === "open" ? "OPEN" : "SETTLED",
  };

  const sortedAgents = [...competition.agents].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.pnl !== left.pnl) return right.pnl - left.pnl;
    return left.name.localeCompare(right.name);
  });

  const agents: ReplayAgentState[] = sortedAgents.map((agent, index) => {
    const hp = deriveHp(agent);
    const xp = deriveXp(agent);
    const streak = deriveStreak(agent);
    const actionSeed = hashString(
      `${competition.id}:${agent.id}:${agent.score}:${agent.pnl}:${agent.trades}:${agent.portfolio}`,
    ).toString(36);
    const positionHint = derivePositionHint(index, sortedAgents.length, agent);
    const heat = deriveHeat(agent, index + 1);
    const signalLabel = deriveSignalLabel(agent, streak);

    return {
      id: agent.id,
      name: agent.name,
      color: agent.color,
      archetype: agent.archetype,
      portfolio: round2(agent.portfolio),
      pnl: round1(agent.pnl),
      trades: agent.trades,
      score: agent.score,
      hp,
      hpMax: 100,
      xp,
      xpMax: 100,
      level: Math.max(1, Math.floor(xp / 25) + 1),
      streak,
      actionSeed,
      actionLabel: deriveActionLabel(agent, events),
      positionHint,
      orbitSlot: index,
      heat,
      shieldPercent: hp,
      xpPercent: xp,
      signalLabel,
    };
  });

  const leaderboard: ReplayLeaderboardRow[] = agents.map((agent, index) => ({
    rank: index + 1,
    agentId: agent.id,
    name: agent.name,
    pnl: agent.pnl,
    portfolio: agent.portfolio,
    score: agent.score,
    streak: agent.streak,
    hp: agent.hp,
  }));

  const trades = events.map((event, index) =>
    normalizeTradeEvent(event, index, blockNumberSeed, competition),
  );

  return {
    meta,
    leaderboard,
    agents,
    trades,
  };
}

export function buildArenaReplayStateById(
  competitionId: string,
  events: TradeEvent[] = tradeFeed,
) {
  const competition = getCompetition(competitionId);
  if (!competition) {
    return null;
  }

  return buildArenaReplayState(competition, events);
}
