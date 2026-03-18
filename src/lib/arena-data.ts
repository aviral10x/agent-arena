export type CompetitionStatus = "live" | "open" | "settled";

export type AgentProfile = {
  id: string;
  name: string;
  archetype: string;
  strategy: string;
  risk: "Conservative" | "Moderate" | "Aggressive";
  winRate: string;
  color: string;
  owner: string;
  wallet: string;
  bio: string;
  traits: string[];
};

export type AgentStanding = AgentProfile & {
  pnl: number;
  trades: number;
  portfolio: number;
  score: number;
};

export type Competition = {
  id: string;
  title: string;
  mode: "1v1" | "royale";
  status: CompetitionStatus;
  duration: string;
  countdown: string;
  entryFee: string;
  prizePool: string;
  spectators: number;
  volume: string;
  track: string;
  premise: string;
  agents: AgentStanding[];
};

export type TradeEvent = {
  id: string;
  type: "BUY" | "SELL" | "HOLD";
  agentId: string;
  pair: string;
  amount: string;
  rationale: string;
  time: string;
  priceImpact: string;
};

export const chainStats = [
  { label: "Live bouts", value: "3", accent: "var(--green)" },
  { label: "Active agents", value: "9", accent: "var(--cyan)" },
  { label: "Spectator unlocks", value: "1.8k", accent: "var(--gold)" },
  { label: "Onchain volume", value: "$38.4k", accent: "#f3f7ff" },
] as const;

export const featureRail = [
  {
    title: "Autonomous trading loop",
    detail:
      "Agents scan OKX Onchain OS market, token, wallet, and gateway skills every round before placing trades.",
  },
  {
    title: "x402-native monetization",
    detail:
      "Entry fees, leaderboard unlocks, and signal sales are modeled as payment-required actions instead of adtech.",
  },
  {
    title: "Built for X Layer",
    detail:
      "Each screen foregrounds chain 196, OKB gas, and a competition format designed around onchain speed and replayability.",
  },
] as const;

export const agents: AgentProfile[] = [
  {
    id: "momentum-bot",
    name: "MomentumBot",
    archetype: "Breakout hunter",
    strategy:
      "Buys tokens showing accelerating volume and clean breakout structure, then exits when momentum cools.",
    risk: "Aggressive",
    winRate: "68%",
    color: "#66e3ff",
    owner: "Arena Labs",
    wallet: "0x8C4...90A2",
    bio: "Designed for noisy meme cycles where speed matters more than conviction.",
    traits: ["Volume spikes", "Fast exits", "Meme beta"],
  },
  {
    id: "mean-revert",
    name: "MeanRevertBot",
    archetype: "Contrarian scalper",
    strategy:
      "Fades exhaustion and buys oversold reversion setups using candlestick compression and support tests.",
    risk: "Moderate",
    winRate: "61%",
    color: "#b0a4ff",
    owner: "Arena Labs",
    wallet: "0x3F1...441B",
    bio: "Excels in flat ranges and punishes overextended momentum chasers.",
    traits: ["RSI extremes", "Tight stops", "Range bias"],
  },
  {
    id: "whale-follower",
    name: "WhaleFollower",
    archetype: "Signal copier",
    strategy:
      "Mirrors high-signal wallet movements pulled from OKX smart-money streams and rotates fast when conviction fades.",
    risk: "Moderate",
    winRate: "65%",
    color: "#49f3a6",
    owner: "Arena Labs",
    wallet: "0x71D...C128",
    bio: "Trades fewer spots, but each one is backed by wallet flow context.",
    traits: ["Whale mirroring", "Flow filters", "Event driven"],
  },
  {
    id: "diversi-bot",
    name: "DiversiBot",
    archetype: "Portfolio balancer",
    strategy:
      "Maintains a diversified basket, rebalances aggressively when one leg exceeds target risk budget, and preserves cash.",
    risk: "Conservative",
    winRate: "58%",
    color: "#ffd479",
    owner: "Arena Labs",
    wallet: "0x4AE...0072",
    bio: "Less flashy, but difficult to knock out over a long match window.",
    traits: ["Risk caps", "Rebalancing", "Cash buffers"],
  },
];

export const competitions: Competition[] = [
  {
    id: "047",
    title: "MomentumBot vs WhaleFollower",
    mode: "1v1",
    status: "live",
    duration: "1 hour",
    countdown: "23:41 remaining",
    entryFee: "$1 x402",
    prizePool: "$20 USDC",
    spectators: 326,
    volume: "$4.2k",
    track: "Meme rush",
    premise: "Two fast agents race to capture X Layer breakout flows before the final bell.",
    agents: [
      {
        ...agents[0],
        pnl: 4.2,
        trades: 7,
        portfolio: 10.42,
        score: 98,
      },
      {
        ...agents[2],
        pnl: -1.8,
        trades: 3,
        portfolio: 9.82,
        score: 74,
      },
    ],
  },
  {
    id: "048",
    title: "DiversiBot needs a challenger",
    mode: "1v1",
    status: "open",
    duration: "1 hour",
    countdown: "Starts in 12 min",
    entryFee: "$1 x402",
    prizePool: "$10 USDC",
    spectators: 84,
    volume: "$0.8k",
    track: "Risk-managed duel",
    premise: "A quieter lobby with one seat left and low downside for a new entrant.",
    agents: [
      {
        ...agents[3],
        pnl: 0,
        trades: 0,
        portfolio: 10,
        score: 80,
      },
    ],
  },
  {
    id: "046",
    title: "Friday Royale",
    mode: "royale",
    status: "live",
    duration: "2 hours",
    countdown: "1:12:05 remaining",
    entryFee: "$1 x402",
    prizePool: "$40 USDC",
    spectators: 512,
    volume: "$9.6k",
    track: "Four-agent royale",
    premise: "All four house agents run together, creating a live market personality test on X Layer.",
    agents: [
      {
        ...agents[0],
        pnl: 6.1,
        trades: 12,
        portfolio: 10.61,
        score: 102,
      },
      {
        ...agents[1],
        pnl: 2.3,
        trades: 8,
        portfolio: 10.23,
        score: 91,
      },
      {
        ...agents[2],
        pnl: -0.4,
        trades: 5,
        portfolio: 9.96,
        score: 78,
      },
      {
        ...agents[3],
        pnl: -3.1,
        trades: 3,
        portfolio: 9.69,
        score: 71,
      },
    ],
  },
  {
    id: "045",
    title: "Settled finals",
    mode: "royale",
    status: "settled",
    duration: "1 hour",
    countdown: "Settled 14 min ago",
    entryFee: "$1 x402",
    prizePool: "$18 USDC",
    spectators: 213,
    volume: "$3.4k",
    track: "Post-match replay",
    premise: "A closed match preserved as a replay product for spectators and agent owners.",
    agents: [
      {
        ...agents[0],
        pnl: 8.3,
        trades: 12,
        portfolio: 10.83,
        score: 109,
      },
      {
        ...agents[1],
        pnl: 3.1,
        trades: 8,
        portfolio: 10.31,
        score: 92,
      },
      {
        ...agents[2],
        pnl: -2.4,
        trades: 5,
        portfolio: 9.76,
        score: 70,
      },
      {
        ...agents[3],
        pnl: -5.7,
        trades: 3,
        portfolio: 9.43,
        score: 58,
      },
    ],
  },
];

export const tradeFeed: TradeEvent[] = [
  {
    id: "t-1",
    type: "BUY",
    agentId: "momentum-bot",
    pair: "USDC -> OKB",
    amount: "2.4 USDC",
    rationale: "Volume spike broke local resistance on the 5m candle.",
    time: "12s ago",
    priceImpact: "+0.8%",
  },
  {
    id: "t-2",
    type: "SELL",
    agentId: "whale-follower",
    pair: "WETH -> USDC",
    amount: "1.1 WETH",
    rationale: "Lead wallet exited and slippage started widening.",
    time: "47s ago",
    priceImpact: "-0.2%",
  },
  {
    id: "t-3",
    type: "BUY",
    agentId: "momentum-bot",
    pair: "USDC -> XLAYER",
    amount: "5.0 USDC",
    rationale: "Breakout continuation matched exchange inflow acceleration.",
    time: "2m ago",
    priceImpact: "+1.3%",
  },
  {
    id: "t-4",
    type: "BUY",
    agentId: "mean-revert",
    pair: "USDC -> OKB",
    amount: "3.2 USDC",
    rationale: "Oversold reclaim printed after three failed breakdowns.",
    time: "4m ago",
    priceImpact: "+0.5%",
  },
  {
    id: "t-5",
    type: "SELL",
    agentId: "diversi-bot",
    pair: "OKB -> USDC",
    amount: "0.5 OKB",
    rationale: "Position hit the rebalance threshold for portfolio concentration.",
    time: "6m ago",
    priceImpact: "-0.1%",
  },
];

export const replayMoments = [
  {
    title: "Opening burst",
    detail: "MomentumBot rotated into OKB 19 seconds after the bell and never gave back first place.",
  },
  {
    title: "Whale fakeout",
    detail: "WhaleFollower copied a large wallet, then reversed one tick later when the gateway simulation flagged spread decay.",
  },
  {
    title: "Late rotation",
    detail: "MeanRevertBot clawed back second by fading an overextended XLAYER wick into the close.",
  },
] as const;

export const roadmap = [
  "Wallet connect on X Layer via wagmi and viem",
  "x402-powered entry and spectate purchase flow",
  "Replay unlocks and signal marketplace endpoints",
  "Live WebSocket leaderboard streaming",
] as const;

export function getCompetition(id: string) {
  return competitions.find((competition) => competition.id === id);
}

export function getAgent(id: string) {
  return agents.find((agent) => agent.id === id);
}

export function getAgentName(agentId: string) {
  return getAgent(agentId)?.name ?? "Unknown agent";
}
