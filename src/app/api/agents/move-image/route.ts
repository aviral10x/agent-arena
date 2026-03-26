import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? 'AIzaSyCLz1iEaxywW8PCI3VuLqwoK0JiUBbMKhU';

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
    const prompt = `Icon for a cyberpunk sport special move called "${name}". Glowing energy art, dark background, neon colors, dramatic action effect, square icon style, ultra-detailed.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: '1:1' },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[move-image] error:', err);
      return NextResponse.json({ error: 'Generation failed' }, { status: 502 });
    }

    const data = await res.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) return NextResponse.json({ error: 'No image' }, { status: 502 });

    MOVE_IMAGE_CACHE.set(name, b64);
    return NextResponse.json({ imageBase64: b64, cached: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
