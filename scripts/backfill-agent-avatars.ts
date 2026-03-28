import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { parseStoredStringArray } from "../src/lib/agent-image-generator";

const prisma = new PrismaClient();
const BACKFILL_ORIGIN = process.env.AGENT_AVATAR_BACKFILL_BASE_URL?.trim() || "https://agent-arena-henna.vercel.app";

async function requestAvatar(agent: {
  name: string;
  archetype: string;
  risk: string;
  specialMoves: string;
  speed: number;
  power: number;
  stamina: number;
  accuracy: number;
}) {
  const response = await fetch(`${BACKFILL_ORIGIN}/api/agents/generate-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: agent.name,
      archetype: agent.archetype,
      playingStyle: agent.risk,
      specialMoves: parseStoredStringArray(agent.specialMoves),
      stats: {
        speed: agent.speed,
        power: agent.power,
        stamina: agent.stamina,
        accuracy: agent.accuracy,
      },
      sport: "badminton",
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.imageBase64) {
    throw new Error(data?.error ?? `Avatar request failed (${response.status})`);
  }

  return {
    imageBase64: data.imageBase64 as string,
    mimeType: (data.mimeType as string | undefined) ?? "image/png",
  };
}

async function main() {
  const agents = await prisma.agent.findMany({
    where: {
      OR: [
        { card: { is: null } },
        { card: { is: { avatarUrl: null } } },
        { card: { is: { avatarUrl: "" } } },
      ],
    },
    include: { card: true },
    orderBy: { createdAt: "asc" },
  });

  if (agents.length === 0) {
    console.log("No agents need avatar backfill.");
    return;
  }

  console.log(`Backfilling avatars for ${agents.length} agent(s)...`);

  for (const agent of agents) {
    console.log(`Generating avatar for ${agent.name} (${agent.id})...`);

    const image = await requestAvatar(agent);

    const dataUrl = `data:${image.mimeType};base64,${image.imageBase64}`;

    await prisma.agentCard.upsert({
      where: { agentId: agent.id },
      update: {
        avatarUrl: dataUrl,
        accentColor: agent.color ?? "#66e3ff",
      },
      create: {
        agentId: agent.id,
        avatarUrl: dataUrl,
        accentColor: agent.color ?? "#66e3ff",
        tagline: agent.strategy ?? "",
      },
    });

    console.log(`Saved avatar for ${agent.name}.`);
  }
}

main()
  .catch((error) => {
    console.error("Avatar backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
