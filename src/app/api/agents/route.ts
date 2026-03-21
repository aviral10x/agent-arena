import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const formatted = agents.map((agent: any) => ({
      ...agent,
      traits: JSON.parse(agent.traits),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const agent = await prisma.agent.create({
      data: {
        name: body.name,
        archetype: body.archetype,
        strategy: body.strategy,
        risk: body.risk,
        color: body.color || "#66e3ff",
        owner: body.owner || "Anonymous",
        wallet: body.wallet || "0x000...0000",
        bio: body.description || "",
        traits: JSON.stringify(body.traits || []),
      },
    });

    return NextResponse.json({
      ...agent,
      traits: JSON.parse(agent.traits),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
