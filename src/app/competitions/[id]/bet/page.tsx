import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BetClient } from "./bet-client";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function BetPage(props: PageProps) {
  const { id } = await props.params;

  const comp = await prisma.competition.findUnique({
    where: { id },
    include: {
      agents: {
        include: { agent: { include: { card: true } } },
        orderBy: { score: "desc" },
      },
      bets: {
        orderBy: { paidAt: "desc" },
        take: 20,
      },
    },
  });

  if (!comp) notFound();

  const [caA, caB] = comp.agents as any[];

  const agentA = caA
    ? {
        id: caA.agent.id,
        name: caA.agent.name,
        color: caA.agent.color,
        archetype: caA.agent.archetype,
        score: caA.score ?? 0,
        speed: (caA.agent as any).speed ?? 7,
        power: (caA.agent as any).power ?? 7,
        stamina: (caA.agent as any).stamina ?? 7,
        accuracy: (caA.agent as any).accuracy ?? 7,
        specialMoves: (() => {
          try { return JSON.parse((caA.agent as any).specialMoves ?? "[]"); } catch { return []; }
        })(),
        avatarUrl: caA.agent.card?.avatarUrl ?? null,
      }
    : null;

  const agentB = caB
    ? {
        id: caB.agent.id,
        name: caB.agent.name,
        color: caB.agent.color,
        archetype: caB.agent.archetype,
        score: caB.score ?? 0,
        speed: (caB.agent as any).speed ?? 7,
        power: (caB.agent as any).power ?? 7,
        stamina: (caB.agent as any).stamina ?? 7,
        accuracy: (caB.agent as any).accuracy ?? 7,
        specialMoves: (() => {
          try { return JSON.parse((caB.agent as any).specialMoves ?? "[]"); } catch { return []; }
        })(),
        avatarUrl: caB.agent.card?.avatarUrl ?? null,
      }
    : null;

  const recentBets = (comp.bets as any[]).map((b) => ({
    id: b.id,
    wallet: b.betterWallet,
    predictedWinnerId: b.predictedWinnerId,
    amountUsdc: b.amountUsdc,
    paidAt: b.paidAt.toISOString(),
  }));

  return (
    <BetClient
      competitionId={id}
      competitionTitle={comp.title}
      agentA={agentA}
      agentB={agentB}
      bettingOpen={(comp as any).bettingOpen ?? false}
      winnerId={(comp as any).winnerId ?? null}
      totalBetUsdc={(comp as any).totalBetUsdc ?? 0}
      status={comp.status as string}
      sport={(comp as any).sport ?? "badminton"}
      recentBets={recentBets}
    />
  );
}
