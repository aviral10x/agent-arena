import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const competition = await prisma.competition.findUnique({
      where: { id },
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
    });

    if (!competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    const formatted = {
      ...competition,
      // FIX 1.2: expose volumeUsd as display string
      volume: `$${(competition.volumeUsd / 1000).toFixed(1)}k`,
      agents: competition.agents.map((ca: any) => ({
        ...ca.agent,
        traits:    JSON.parse(ca.agent.traits),
        pnl:       ca.pnl,
        pnlPct:    ca.pnlPct,   // FIX 1.1
        trades:    ca.trades,
        portfolio: ca.portfolio,
        score:     ca.score,
      })),
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch competition:", error);
    return NextResponse.json({ error: "Failed to fetch competition" }, { status: 500 });
  }
}
