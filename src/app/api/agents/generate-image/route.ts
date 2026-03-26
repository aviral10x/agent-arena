import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? 'AIzaSyCLz1iEaxywW8PCI3VuLqwoK0JiUBbMKhU';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, archetype, playingStyle, stats, specialMoves, sport } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const archetypeLabel = archetype ?? 'athlete';
    const protocol = playingStyle ?? 'Moderate';
    const spd = stats?.speed ?? 7;
    const pwr = stats?.power ?? 7;
    const sta = stats?.stamina ?? 7;
    const acc = stats?.accuracy ?? 7;
    const moves: string[] = Array.isArray(specialMoves) ? specialMoves : [];

    // Build personality from stats
    const statTraits = [
      spd >= 9 ? 'lightning-fast movement' : spd >= 7 ? 'agile footwork' : 'calculated positioning',
      pwr >= 9 ? 'explosive power' : pwr >= 7 ? 'strong strikes' : 'technical precision',
      sta >= 9 ? 'tireless endurance' : sta >= 7 ? 'steady stamina' : 'burst-focused energy',
      acc >= 9 ? 'pinpoint accuracy' : acc >= 7 ? 'precise placement' : 'raw force over finesse',
    ].join(', ');

    const protocolStyle = protocol === 'Aggressive'
      ? 'fierce battle stance, intense eyes, attack-ready posture'
      : protocol === 'Defensive'
      ? 'calm defensive stance, shielded posture, watchful gaze'
      : 'balanced athletic stance, focused expression';

    const abilitiesDesc = moves.length > 0
      ? `Signature moves: ${moves.join(' and ')}. `
      : '';

    const prompt = `Cyberpunk sport athlete portrait. Athlete designation: "${name}". Combat chassis: ${archetypeLabel}. Operational protocol: ${protocol} — ${protocolStyle}. Physical profile: ${statTraits}. ${abilitiesDesc}Dark arena environment, neon cyan (#00f0ff) and electric magenta energy glows, futuristic athletic gear with glowing accents, dynamic pose, cinematic lighting, ultra-detailed digital art, dark #05060e background. Square composition, centered full portrait.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '1:1',
            safetyFilterLevel: 'block_only_high',
            personGeneration: 'allow_adult',
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[generate-image] Google AI error:', err);
      return NextResponse.json({ error: 'Image generation failed' }, { status: 502 });
    }

    const data = await res.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;

    if (!b64) {
      console.error('[generate-image] No image in response:', JSON.stringify(data).slice(0, 300));
      return NextResponse.json({ error: 'No image returned' }, { status: 502 });
    }

    return NextResponse.json({ imageBase64: b64, mimeType: 'image/png' });
  } catch (err: any) {
    console.error('[generate-image] error:', err);
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
