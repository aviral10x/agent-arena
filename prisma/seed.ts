import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { agents, competitions, tradeFeed } from "../src/lib/arena-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Seed Agents
  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { id: agent.id },
      update: {},
      create: {
        id: agent.id,
        name: agent.name,
        archetype: agent.archetype,
        strategy: agent.strategy,
        risk: agent.risk,
        winRate: agent.winRate,
        color: agent.color,
        owner: agent.owner,
        wallet: agent.wallet,
        bio: agent.bio,
        traits: JSON.stringify(agent.traits),
      },
    });
  }
  console.log(`Seeded ${agents.length} agents`);

  // 2. Seed Competitions and join table CompetitionAgent
  for (const comp of competitions) {
    const createdComp = await prisma.competition.upsert({
      where: { id: comp.id },
      update: {},
      create: {
        id: comp.id,
        title: comp.title,
        mode: comp.mode,
        status: comp.status,
        duration: comp.duration,
        countdown: comp.countdown,
        entryFee: comp.entryFee,
        prizePool: comp.prizePool,
        spectators: comp.spectators,
        volume: comp.volume,
        track: comp.track,
        premise: comp.premise,
      },
    });

    for (const ca of comp.agents) {
      await prisma.competitionAgent.upsert({
        where: {
          competitionId_agentId: {
            competitionId: comp.id,
            agentId: ca.id,
          },
        },
        update: {},
        create: {
          competitionId: comp.id,
          agentId: ca.id,
          pnl: ca.pnl,
          portfolio: ca.portfolio,
          trades: ca.trades,
          score: ca.score,
        },
      });
    }
  }
  console.log(`Seeded ${competitions.length} competitions`);

  // 3. Seed Trades
  for (const trade of tradeFeed) {
    await prisma.trade.upsert({
      where: { id: trade.id },
      update: {},
      create: {
        id: trade.id,
        type: trade.type,
        agentId: trade.agentId,
        competitionId: "047", // Hardcode 047 for the static trades since they apply to the live bout
        pair: trade.pair,
        amount: trade.amount,
        rationale: trade.rationale,
        priceImpact: trade.priceImpact,
        time: trade.time,
      },
    });
  }
  console.log(`Seeded ${tradeFeed.length} trades`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeding complete!");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
