import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
      agents: competition.agents.map((ca: any) => ({
        ...ca.agent,
        traits: JSON.parse(ca.agent.traits),
        pnl: ca.pnl,
        trades: ca.trades,
        portfolio: ca.portfolio,
        score: ca.score,
      })),
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch competition:", error);
    return NextResponse.json({ error: "Failed to fetch competition" }, { status: 500 });
  }
}
