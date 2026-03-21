import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const competitions = await prisma.competition.findMany({
      include: {
        agents: {
          include: {
            agent: true,
          },
          orderBy: {
            score: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform to match the frontend Competition type
    const formatted = competitions.map((comp: any) => ({
      ...comp,
      agents: comp.agents.map((ca: any) => ({
        ...ca.agent,
        traits: JSON.parse(ca.agent.traits),
        pnl: ca.pnl,
        trades: ca.trades,
        portfolio: ca.portfolio,
        score: ca.score,
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch competitions:", error);
    return NextResponse.json({ error: "Failed to fetch competitions" }, { status: 500 });
  }
}
