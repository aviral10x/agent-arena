import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const trades = await prisma.trade.findMany({
      where: { competitionId: id },
      include: { agent: true },
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    const formatted = trades.map((t: any) => ({
      id: t.id,
      type: t.type,
      agentId: t.agentId,
      agentName: t.agent.name,
      pair: t.pair,
      amount: t.amount,
      rationale: t.rationale,
      priceImpact: t.priceImpact,
      time: t.time,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch trades:", error);
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 });
  }
}
