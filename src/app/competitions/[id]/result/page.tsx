import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ResultClient } from "./result-client";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function ResultPage(props: PageProps) {
  const { id } = await props.params;

  const comp = await prisma.competition.findUnique({
    where: { id },
    include: {
      agents: {
        include: { agent: true },
        orderBy: { score: "desc" },
      },
    },
  });

  if (!comp) notFound();

  const [caA, caB] = comp.agents as any[];

  const agentA = caA ? {
    id:        caA.agent.id,
    name:      caA.agent.name,
    color:     caA.agent.color,
    archetype: caA.agent.archetype,
    score:     caA.score ?? 0,
    pnlPct:    caA.pnlPct ?? 0,
    speed:     (caA.agent as any).speed    ?? 7,
    power:     (caA.agent as any).power    ?? 7,
    stamina:   (caA.agent as any).stamina  ?? 7,
    accuracy:  (caA.agent as any).accuracy ?? 7,
  } : null;

  const agentB = caB ? {
    id:        caB.agent.id,
    name:      caB.agent.name,
    color:     caB.agent.color,
    archetype: caB.agent.archetype,
    score:     caB.score ?? 0,
    pnlPct:    caB.pnlPct ?? 0,
    speed:     (caB.agent as any).speed    ?? 7,
    power:     (caB.agent as any).power    ?? 7,
    stamina:   (caB.agent as any).stamina  ?? 7,
    accuracy:  (caB.agent as any).accuracy ?? 7,
  } : null;

  const winnerId     = (comp as any).winnerId ?? null;
  const totalRallies = (comp as any).totalRallies ?? 0;
  const sport        = (comp as any).sport ?? "badminton";

  return (
    <ResultClient
      competitionId={id}
      competitionTitle={comp.title}
      agentA={agentA}
      agentB={agentB}
      winnerId={winnerId}
      totalRallies={totalRallies}
      sport={sport}
      status={comp.status as string}
    />
  );
}
