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

    const protocol = playingStyle ?? 'Moderate';
    const moves: string[] = Array.isArray(specialMoves) ? specialMoves : [];

    // ═══ VISUAL DICTIONARY — maps game stats to cinematic visual keywords ═══

    const chassisDict: Record<string, string> = {
      'Speed Demon':          'Sleek, lightweight aerodynamic cybernetic suit, streamlined armor plating, razor-thin visor.',
      'Power Hitter':         'Massive, bulky heavy-duty mecha armor, thick reinforced titanium plating, imposing silhouette.',
      'Net Dominator':        'Holographic visor, neural-link cables exposed on the neck, high-tech tactical gear, predator-like stance.',
      'Endurance Baseliner':  'Rugged, battle-scarred medium armor, utility pouches, survivalist cybernetics, weathered veteran look.',
      'Counter Specialist':   'Asymmetrical armor, reactive sensory nodes glowing on shoulders, stealth-coated dark metal, calculated gaze.',
      'Adaptive All-Rounder': 'Modular, perfectly balanced cyber-suit, clean pristine metallic finish, versatile loadout visible.',
    };

    const protocolDict: Record<string, string> = {
      'Aggressive': 'Emitting an intense red and orange glowing aura, sharp jagged armor details, menacing attack-ready posture, fiery eyes.',
      'Moderate':   'Emitting a cool white and cyan glowing aura, balanced focused posture, calm intensity radiating from visor.',
      'Defensive':  'Emitting a deep blue and green glowing aura, generating a faint hexagonal energy shield around forearms, guardian stance.',
    };

    const abilityDict: Record<string, string> = {
      'Thunder Smash':   'Crackling with electric arcs and lightning visual effects around fists.',
      'Lightning Drive': 'Crackling with electric arcs and lightning visual effects streaking from armor.',
      'Ghost Drop':      'Parts of the armor cloaked in smoky, semi-transparent shadowy aura, ethereal.',
      'Phantom Clear':   'Parts of the armor cloaked in smoky, semi-transparent ghostly mist.',
      'Net Kill':        'Surrounded by glowing digital neon threads and web-like energy lines.',
      'Silk Drop':       'Surrounded by flowing gossamer light threads, delicate but deadly.',
      'Mirror Drive':    'Armor features highly reflective, mirror-like chrome surfaces refracting prismatic light.',
      'Endurance Drive': 'Glowing green stamina veins pulsing through armor plates, relentless energy.',
      'Adaptive Smash':  'Armor shifts color dynamically, chameleon-like adaptive plating, versatile energy.',
      'Shadow Lob':      'Trailing dark purple shadow afterimages, stealth movement visualization.',
    };

    const chassisDesc = chassisDict[archetype ?? ''] ?? 'Futuristic cybernetic combat armor, balanced proportions.';
    const protocolDesc = protocolDict[protocol] ?? protocolDict['Moderate'];
    const abilityDescs = moves
      .slice(0, 2)
      .map(m => abilityDict[m] ?? '')
      .filter(Boolean)
      .join(' ');

    const basePrompt = 'A cinematic portrait of a sci-fi cyberpunk combat agent, waist-up, dark moody lighting, highly detailed 8k render, glowing neon accents, isolated on a dark background.';

    const prompt = `${basePrompt} ${chassisDesc} ${protocolDesc} ${abilityDescs} Agent designation "${name}" etched on shoulder plate. Square composition, centered portrait, dark #0c0e16 background.`;

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
