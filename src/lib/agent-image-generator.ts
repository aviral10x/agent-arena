type AgentAvatarInput = {
  name: string;
  archetype?: string | null;
  playingStyle?: string | null;
  stats?: {
    speed?: number | null;
    power?: number | null;
    stamina?: number | null;
    accuracy?: number | null;
  } | null;
  specialMoves?: string[] | null;
  sport?: string | null;
};

type ImagenOptions = {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  personGeneration?: "dont_allow" | "allow_adult" | "allow_all";
  seed?: number;
};

export type ImagenResult = {
  imageBase64: string;
  mimeType: string;
};

const GOOGLE_IMAGEN_MODEL = "imagen-4.0-fast-generate-001";
const GOOGLE_IMAGEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_IMAGEN_MODEL}:predict`;

const NEGATIVE_PROMPTS = {
  avatar: "text, letters, typography, watermark, logo, frame, border, multiple characters, duplicate face, extra limbs, cropped head, blurry details, washed out lighting",
  move: "text, letters, typography, watermark, logo, frame, border, human face, anatomy, duplicate objects, blurry details",
} as const;

const CHASSIS_DICT: Record<string, string> = {
  "Speed Demon": "sleek lightweight cybernetic armor, aerodynamic plating, razor-thin visor, coiled sprinter stance",
  "Power Hitter": "massive heavy-duty mech armor, reinforced shoulders, thick titanium plating, explosive attack posture",
  "Net Dominator": "predator-like tactical suit, holographic visor, neural-link cables, elite close-range hunter silhouette",
  "Endurance Baseliner": "rugged battle-scarred armor, weathered veteran finish, utility plating, iron-willed stance",
  "Counter Specialist": "asymmetrical stealth armor, reactive sensory nodes, dark coated metal, calculating defensive posture",
  "Adaptive All-Rounder": "modular balanced cyber-suit, pristine metallic finish, versatile loadout, elite arena-athlete silhouette",
};

const PROTOCOL_DICT: Record<string, string> = {
  Aggressive: "red and orange energy bloom, jagged highlights, menacing attack-ready body language",
  Moderate: "cool white and cyan energy glow, composed centerline stance, controlled intensity",
  Defensive: "deep blue and green aura, subtle hexagonal shield motif, guardian posture",
};

const SPORT_DICT: Record<string, string> = {
  badminton: "futuristic racket-sport champion aesthetic, elite indoor arena lighting, agile shoulder line",
  tennis: "futuristic court champion aesthetic, grand stadium atmosphere, explosive pro-athlete poise",
  "table-tennis": "futuristic reflex athlete aesthetic, tight competitive arena, hyper-fast precision stance",
};

const ABILITY_DICT: Record<string, string> = {
  "Thunder Smash": "electric arcs coil around the gauntlets and shoulders",
  "Lightning Drive": "high-voltage streaks trail across the armor plating",
  "Ghost Drop": "smoky semi-transparent shadow aura wraps around the frame",
  "Phantom Clear": "ghostly mist and spectral motion traces hover around the armor",
  "Net Kill": "digital neon thread lines and execution-strike geometry surround the subject",
  "Silk Drop": "flowing gossamer light threads create a delicate but dangerous halo",
  "Mirror Drive": "mirror-polished chrome surfaces refract sharp prismatic light",
  "Endurance Drive": "green stamina veins pulse beneath armored seams",
  "Adaptive Smash": "color-shifting adaptive plating ripples across the chassis",
  "Shadow Lob": "dark afterimages streak behind the subject",
};

const DOMINANT_STAT_DICT: Record<string, string> = {
  speed: "emphasize explosive acceleration, light-footed balance, dynamic motion tension",
  power: "emphasize broad upper body mass, impact energy, heavy striking potential",
  stamina: "emphasize durable frame, relentless endurance, unbreakable veteran presence",
  accuracy: "emphasize laser-focused visor detail, surgical precision, disciplined posture",
};

function requireGoogleAiApiKey(): string {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY not configured");
  }
  return apiKey;
}

function stableSeed(...parts: Array<string | number | null | undefined>): number {
  const value = parts.filter(Boolean).join("|");
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % 2147483646 + 1;
}

function inferDominantStat(stats?: AgentAvatarInput["stats"]): string {
  if (!stats) return "";
  const entries: Array<[keyof typeof DOMINANT_STAT_DICT, number]> = [
    ["speed", stats.speed ?? 0],
    ["power", stats.power ?? 0],
    ["stamina", stats.stamina ?? 0],
    ["accuracy", stats.accuracy ?? 0],
  ];
  const [key] = [...entries].sort((a, b) => b[1] - a[1])[0] ?? [];
  return key ? DOMINANT_STAT_DICT[key] ?? "" : "";
}

export function parseStoredStringArray(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function buildAgentAvatarPrompt(input: AgentAvatarInput): string {
  const sport = SPORT_DICT[input.sport ?? ""] ?? "futuristic elite arena athlete aesthetic, cinematic stadium backlight";
  const chassis = CHASSIS_DICT[input.archetype ?? ""] ?? "futuristic cybernetic arena armor with balanced proportions";
  const protocol = PROTOCOL_DICT[input.playingStyle ?? ""] ?? PROTOCOL_DICT.Moderate;
  const dominantStat = inferDominantStat(input.stats);
  const abilities = (input.specialMoves ?? [])
    .slice(0, 2)
    .map((move) => ABILITY_DICT[move] ?? "")
    .filter(Boolean)
    .join(", ");

  const clauses = [
    "Cinematic portrait of a cyberpunk sport combat agent, centered bust portrait, dark moody arena lighting, premium character-card key art, high detail.",
    sport,
    chassis,
    protocol,
    dominantStat,
    abilities,
    `agent designation "${input.name}" suggested by the design language only, no visible readable text`,
    "single character only, dark background #0c0e16, neon rim light, dramatic atmosphere",
  ].filter(Boolean);

  return clauses.join(" ");
}

export function buildMoveIconPrompt(name: string): string {
  return [
    `Icon for a cyberpunk sport special move called "${name}".`,
    "Square single-subject energy icon, dark background, neon accents, dramatic action effect, premium game ability art.",
    "No readable text, no UI frame, no watermark.",
  ].join(" ");
}

export async function generateImagenImage(options: ImagenOptions): Promise<ImagenResult> {
  const apiKey = requireGoogleAiApiKey();

  const response = await fetch(GOOGLE_IMAGEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      instances: [{ prompt: options.prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: options.aspectRatio ?? "1:1",
        safetyFilterLevel: "block_only_high",
        personGeneration: options.personGeneration ?? "allow_adult",
        negativePrompt: options.negativePrompt,
        enhancePrompt: false,
        seed: options.seed,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Imagen error (${response.status}): ${errorText.slice(0, 500)}`);
  }

  const data = await response.json();
  const prediction = data?.predictions?.[0];
  const imageBase64 = prediction?.bytesBase64Encoded;
  const mimeType = prediction?.mimeType ?? "image/png";

  if (!imageBase64) {
    throw new Error(`No image returned by Google Imagen: ${JSON.stringify(data).slice(0, 500)}`);
  }

  return { imageBase64, mimeType };
}

export async function generateAgentAvatarImage(input: AgentAvatarInput): Promise<ImagenResult> {
  const specialMoves = input.specialMoves ?? [];

  return generateImagenImage({
    prompt: buildAgentAvatarPrompt(input),
    negativePrompt: NEGATIVE_PROMPTS.avatar,
    aspectRatio: "1:1",
    personGeneration: "allow_adult",
    seed: stableSeed(input.name, input.archetype, input.playingStyle, input.sport, ...specialMoves),
  });
}

export async function generateMoveIconImage(name: string): Promise<ImagenResult> {
  return generateImagenImage({
    prompt: buildMoveIconPrompt(name),
    negativePrompt: NEGATIVE_PROMPTS.move,
    aspectRatio: "1:1",
    personGeneration: "dont_allow",
    seed: stableSeed("move", name),
  });
}
