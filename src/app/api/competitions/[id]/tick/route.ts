import { NextResponse } from "next/server";
import { runCompetitionTick } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Authorization check would go here (e.g., verifying a cron secret)
    
    const results = await runCompetitionTick(id);

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Failed to run competition tick:", error);
    return NextResponse.json({ error: error.message || "Tick failed" }, { status: 500 });
  }
}
