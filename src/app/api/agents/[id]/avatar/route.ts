import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAgentAvatar } from "@/lib/agent-avatars";
import { generateAgentAvatarImage, parseStoredStringArray } from "@/lib/agent-image-generator";

export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

function imageResponse(buffer: Buffer, mimeType = "image/png") {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

function parseDataUrl(dataUrl: string): { mimeType: string; bytes: Buffer } | null {
  if (!dataUrl.startsWith("data:")) return null;
  const separatorIndex = dataUrl.indexOf(",");
  if (separatorIndex < 0) return null;

  const metadata = dataUrl.slice(5, separatorIndex);
  const payload = dataUrl.slice(separatorIndex + 1);
  const [mimeType, encoding] = metadata.split(";");
  if (encoding !== "base64" || !payload) return null;

  return {
    mimeType: mimeType || "image/png",
    bytes: Buffer.from(payload, "base64"),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { card: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const savedAvatar = agent.card?.avatarUrl?.trim();
    if (savedAvatar) {
      if (savedAvatar.startsWith("data:")) {
        const parsed = parseDataUrl(savedAvatar);
        if (parsed) return imageResponse(parsed.bytes, parsed.mimeType);
      }

      return NextResponse.redirect(savedAvatar);
    }

    try {
      const image = await generateAgentAvatarImage({
        name: agent.name,
        archetype: agent.archetype,
        playingStyle: agent.risk,
        specialMoves: parseStoredStringArray(agent.specialMoves),
        stats: {
          speed: agent.speed,
          power: agent.power,
          stamina: agent.stamina,
          accuracy: agent.accuracy,
        },
        sport: "badminton",
      });

      const dataUrl = `data:${image.mimeType};base64,${image.imageBase64}`;

      await prisma.agentCard.upsert({
        where: { agentId: agent.id },
        update: {
          avatarUrl: dataUrl,
          accentColor: agent.color ?? "#66e3ff",
        },
        create: {
          agentId: agent.id,
          avatarUrl: dataUrl,
          accentColor: agent.color ?? "#66e3ff",
          tagline: agent.strategy ?? "",
        },
      });

      return imageResponse(Buffer.from(image.imageBase64, "base64"), image.mimeType);
    } catch (error) {
      console.error("[agent-avatar] generation failed, using fallback:", error);
      return NextResponse.redirect(getAgentAvatar(agent.id, agent.archetype));
    }
  } catch (error) {
    console.error("[agent-avatar] request failed:", error);
    return NextResponse.json({ error: "Failed to resolve avatar" }, { status: 500 });
  }
}
