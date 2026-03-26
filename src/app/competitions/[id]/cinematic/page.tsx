import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CinematicMatchClient } from "./cinematic-match-client";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function CinematicMatchPage(props: PageProps) {
  const { id } = await props.params;

  const compRecord = await prisma.competition.findUnique({
    where: { id },
    include: {
      agents: {
        include: { agent: true },
        orderBy: { score: "desc" },
      },
    },
  });

  if (!compRecord) notFound();

  const [caA, caB] = compRecord.agents as any[];

  const agentA = caA
    ? {
        id: caA.agent.id,
        name: caA.agent.name,
        color: caA.agent.color,
        archetype: caA.agent.archetype,
        score: caA.score ?? 0,
        pnlPct: caA.pnlPct ?? 0,
      }
    : null;

  const agentB = caB
    ? {
        id: caB.agent.id,
        name: caB.agent.name,
        color: caB.agent.color,
        archetype: caB.agent.archetype,
        score: caB.score ?? 0,
        pnlPct: caB.pnlPct ?? 0,
      }
    : null;

  const totalBetUsdc = (compRecord as any).totalBetUsdc ?? 0;

  const probA = agentA && agentB
    ? Math.round(((agentA.score + 1) / Math.max(1, agentA.score + agentB.score + 2)) * 100)
    : 50;
  const probB = 100 - probA;
  const oddsA = Math.max(1.1, 100 / probA).toFixed(2);
  const oddsB = Math.max(1.1, 100 / probB).toFixed(2);

  return (
    <CinematicMatchClient
      competitionId={id}
      competitionTitle={compRecord.title}
      competitionStatus={compRecord.status as string}
      agentA={agentA}
      agentB={agentB}
      totalBetUsdc={totalBetUsdc}
      probA={probA}
      probB={probB}
      oddsA={oddsA}
      oddsB={oddsB}
    />
  );
}
