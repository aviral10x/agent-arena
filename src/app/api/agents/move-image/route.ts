import { NextResponse } from 'next/server';
import { generateMoveIconImage } from '@/lib/agent-image-generator';

export const dynamic = 'force-dynamic';

// Server-side singleton cache — persists for the lifetime of the Node process
const MOVE_IMAGE_CACHE = new Map<string, string>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name')?.trim();

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  // Return cached image immediately
  if (MOVE_IMAGE_CACHE.has(name)) {
    return NextResponse.json({ imageBase64: MOVE_IMAGE_CACHE.get(name), cached: true });
  }

  try {
    const image = await generateMoveIconImage(name);
    const b64 = image.imageBase64;

    MOVE_IMAGE_CACHE.set(name, b64);
    return NextResponse.json({ imageBase64: b64, cached: false });
  } catch (err: unknown) {
    console.error('[move-image] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('GOOGLE_AI_API_KEY')
      ? 503
      : message.includes('Google Imagen error')
        ? 502
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
