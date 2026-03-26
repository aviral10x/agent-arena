import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LiveMatchClient } from "./live-match-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ wallet?: string }>;
};

export default async function LiveMatchPage(props: PageProps) {
  const { id } = await props.params;
  const { wallet: viewerWallet } = await props.searchParams;

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
        strategy: caA.agent.strategy ?? "Unknown",
        risk: caA.agent.risk ?? "Medium",
        speed: (caA.agent as any).speed ?? 7,
        power: (caA.agent as any).power ?? 7,
        stamina: (caA.agent as any).stamina ?? 7,
        accuracy: (caA.agent as any).accuracy ?? 7,
        score: caA.score ?? 0,
        pnlPct: caA.pnlPct ?? 0,
        trades: caA.trades ?? 0,
        owner: caA.agent.owner ?? "",
      }
    : null;

  const agentB = caB
    ? {
        id: caB.agent.id,
        name: caB.agent.name,
        color: caB.agent.color,
        archetype: caB.agent.archetype,
        strategy: caB.agent.strategy ?? "Unknown",
        risk: caB.agent.risk ?? "Medium",
        speed: (caB.agent as any).speed ?? 7,
        power: (caB.agent as any).power ?? 7,
        stamina: (caB.agent as any).stamina ?? 7,
        accuracy: (caB.agent as any).accuracy ?? 7,
        score: caB.score ?? 0,
        pnlPct: caB.pnlPct ?? 0,
        trades: caB.trades ?? 0,
        owner: caB.agent.owner ?? "",
      }
    : null;

  const totalBetUsdc = (compRecord as any).totalBetUsdc ?? 0;
  const isSport = (compRecord as any).type === "sport";

  // Derive odds from bet distribution or fallback to even
  const rawOddsA = totalBetUsdc > 0 ? 1 / ((agentA?.score ?? 1) / Math.max(1, (agentA?.score ?? 0) + (agentB?.score ?? 0))) : 0.5;
  const probA = agentA && agentB
    ? Math.round(((agentA.score + 1) / Math.max(1, agentA.score + agentB.score + 2)) * 100)
    : 50;
  const probB = 100 - probA;
  const oddsA = probA > 0 ? Math.max(1.1, (100 / probA)).toFixed(2) : "2.00";
  const oddsB = probB > 0 ? Math.max(1.1, (100 / probB)).toFixed(2) : "2.00";

  return (
    <LiveMatchClient
      competitionId={id}
      competitionTitle={compRecord.title}
      competitionStatus={compRecord.status as string}
      agentA={agentA}
      agentB={agentB}
      totalBetUsdc={totalBetUsdc}
      oddsA={oddsA.toString()}
      oddsB={oddsB.toString()}
      isSport={isSport}
      sport={(compRecord as any).sport ?? "badminton"}
      viewerWallet={viewerWallet ?? ""}
    />
  );
}
