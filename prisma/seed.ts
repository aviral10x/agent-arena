import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { agents, competitions, tradeFeed } from "../src/lib/arena-data";

const prisma = new PrismaClient();

// Parse raw dollar volume from display strings like "$4.2k" → 4200
function parseVolumeUsd(str: string): number {
  const n = parseFloat(str.replace(/[^0-9.]/g, "") || "0");
  if (str.toLowerCase().includes("k")) return n * 1000;
  if (str.toLowerCase().includes("m")) return n * 1_000_000;
  return n;
}

async function main() {
  console.log("Seeding database...");

  // 1. Seed Agents
  for (const agent of agents) {
    await prisma.agent.upsert({
      where:  { id: agent.id },
      update: {},
      create: {
        id:        agent.id,
        name:      agent.name,
        archetype: agent.archetype,
        strategy:  agent.strategy,
        risk:      agent.risk,
        winRate:   agent.winRate,
        color:     agent.color,
        owner:     agent.owner,
        wallet:    agent.wallet,
        bio:       agent.bio,
        traits:    JSON.stringify(agent.traits),
      },
    });
  }
  console.log(`Seeded ${agents.length} agents`);

  // 2. Seed Competitions + CompetitionAgent join rows
  for (const comp of competitions) {
    await prisma.competition.upsert({
      where:  { id: comp.id },
      update: {},
      create: {
        id:          comp.id,
        title:       comp.title,
        mode:        comp.mode,
        status:      comp.status,
        duration:    comp.duration,
        countdown:   comp.countdown,
        entryFee:    comp.entryFee,
        prizePool:   comp.prizePool,
        spectators:  comp.spectators,
        volumeUsd:   parseVolumeUsd((comp as any).volume ?? "0"), // FIX 1.2
        track:       comp.track,
        premise:     comp.premise,
        startedAt:   comp.status === "live" || comp.status === "settled" ? new Date() : null,
      },
    });

    for (const ca of comp.agents) {
      const startingPortfolio = 10;
      await prisma.competitionAgent.upsert({
        where: {
          competitionId_agentId: { competitionId: comp.id, agentId: ca.id },
        },
        update: {},
        create: {
          competitionId:     comp.id,
          agentId:           ca.id,
          pnl:               ca.pnl,
          pnlPct:            ((ca.portfolio - startingPortfolio) / startingPortfolio) * 100, // FIX 1.1
          portfolio:         ca.portfolio,
          startingPortfolio,
          trades:            ca.trades,
          score:             ca.score,
        },
      });
    }
  }
  console.log(`Seeded ${competitions.length} competitions`);

  // 3. Seed Trades (remove hardcoded "time" field — FIX 1.3)
  for (const trade of tradeFeed) {
    await prisma.trade.upsert({
      where:  { id: trade.id },
      update: {},
      create: {
        id:            trade.id,
        type:          trade.type,
        agentId:       trade.agentId,
        competitionId: "047",
        pair:          trade.pair,
        amount:        trade.amount,
        amountUsd:     parseFloat(trade.amount.replace(/[^0-9.]/g, "") || "0"),
        rationale:     trade.rationale,
        priceImpact:   trade.priceImpact,
        // timestamp defaults to now() — FIX 1.3
      },
    });
  }
  console.log(`Seeded ${tradeFeed.length} trades`);
}

main()
  .then(async () => { await prisma.$disconnect(); console.log("Seeding complete!"); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
