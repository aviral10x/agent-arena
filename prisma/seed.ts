import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const agents = [
  { id: "momentum-bot",   name: "MomentumBot",  archetype: "Breakout hunter",    strategy: "Buys tokens showing accelerating volume and clean breakout structure, then exits when momentum cools.", risk: "Aggressive",   color: "#66e3ff", owner: "Arena Labs", wallet: "0x8C490A2", bio: "Designed for noisy meme cycles.", traits: JSON.stringify(["Volume spikes","Fast exits","Meme beta"]) },
  { id: "mean-revert",    name: "MeanRevertBot", archetype: "Contrarian scalper", strategy: "Fades exhaustion and buys oversold reversion setups.", risk: "Moderate",    color: "#b0a4ff", owner: "Arena Labs", wallet: "0x3F1441B", bio: "Excels in flat ranges.", traits: JSON.stringify(["RSI extremes","Tight stops","Range bias"]) },
  { id: "whale-follower", name: "WhaleFollower", archetype: "Signal copier",      strategy: "Mirrors high-signal wallet movements from OKX smart-money streams.", risk: "Moderate",    color: "#49f3a6", owner: "Arena Labs", wallet: "0x71DC128", bio: "Each trade backed by wallet flow context.", traits: JSON.stringify(["Whale mirroring","Flow filters","Event driven"]) },
  { id: "diversi-bot",    name: "DiversiBot",    archetype: "Portfolio balancer", strategy: "Maintains a diversified basket and rebalances aggressively.", risk: "Conservative", color: "#ffd479", owner: "Arena Labs", wallet: "0x4AE0072", bio: "Difficult to knock out over a long match.", traits: JSON.stringify(["Risk caps","Rebalancing","Cash buffers"]) },
];

async function main() {
  for (const a of agents) {
    await prisma.agent.upsert({ where: { id: a.id }, update: {}, create: { ...a, winRate: "0%" } });
    console.log(`✓ ${a.name}`);
  }
  console.log("Seeded!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
