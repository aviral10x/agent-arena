import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { onCompetitionSettle } from "@/lib/stats";
import { settleBets } from "@/lib/betting";

export const dynamic = "force-dynamic";

// Called by PartyKit match server when a match ends
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { winnerId, gameState } = body as { winnerId?: string; gameState?: any };

  if (!winnerId) {
    return NextResponse.json({ error: "winnerId required" }, { status: 400 });
  }

  const comp = await prisma.competition.findUnique({ where: { id } });
  if (!comp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comp.status === "settled") return NextResponse.json({ ok: true, message: "already settled" });

  // Compute total rallies from game state
  const totalRallies = gameState?.rallyCount ?? (comp as any).totalRallies ?? 0;

  await prisma.competition.update({
    where: { id },
    data: {
      status: "settled",
      winnerId,
      isTicking: false,
      bettingOpen: false,
      totalRallies,
      ...(gameState ? { gameState: JSON.stringify(gameState) } : {}),
    },
  });

  // Update agent career stats
  await onCompetitionSettle(id).catch(e =>
    console.error("[settle] stats update failed:", e.message)
  );

  // Pay out spectator bets
  await settleBets(id, winnerId).catch(e =>
    console.error("[settle] bet settlement failed:", e.message)
  );

  return NextResponse.json({ ok: true, winnerId });
}
