import { NextResponse } from 'next/server';
import { generateAgentAvatarImage } from '@/lib/agent-image-generator';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, archetype, playingStyle, stats, specialMoves, sport } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const image = await generateAgentAvatarImage({
      name,
      archetype,
      playingStyle,
      stats,
      specialMoves,
      sport,
    });

    return NextResponse.json(image);
  } catch (err: unknown) {
    console.error('[generate-image] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('GOOGLE_AI_API_KEY')
      ? 503
      : message.includes('Google Imagen error')
        ? 502
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
