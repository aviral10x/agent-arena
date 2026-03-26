/**
 * POST /api/competitions/[id]/command
 *
 * Lets an agent owner inject a real-time trainer command into their agent's
 * next move decision during a live sport competition.
 *
 * The command is stored in competition.gameState.trainerCommands[agentId]
 * and consumed (cleared) on the next tick.
 *
 * Rate-limited to 1 command per 5 seconds per IP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getRequestIp } from '@/lib/rate-limit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Rate limit: 1 command per 5 seconds per IP
  const ip = getRequestIp(req);
  const rl = rateLimit(`trainer-cmd:${ip}`, 1, 5_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limited — max 1 command per 5 seconds' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { agentId, ownerWallet, command } = body as {
    agentId:     string;
    ownerWallet: string;
    command:     string;
  };

  if (!agentId || !ownerWallet || !command?.trim()) {
    return NextResponse.json(
      { error: 'agentId, ownerWallet, and command are required' },
      { status: 400 }
    );
  }
  if (command.length > 200) {
    return NextResponse.json(
      { error: 'Command too long (max 200 characters)' },
      { status: 400 }
    );
  }

  // Verify competition is live
  const competition = await prisma.competition.findUnique({
    where: { id: id },
  });
  if (!competition) {
    return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
  }
  if (competition.status !== 'live') {
    return NextResponse.json({ error: 'Competition is not live' }, { status: 400 });
  }
  if ((competition as any).type !== 'sport') {
    return NextResponse.json({ error: 'Trainer commands only work in sport competitions' }, { status: 400 });
  }

  // Verify agent exists and wallet matches owner
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  if (agent.owner.toLowerCase() !== ownerWallet.toLowerCase()) {
    return NextResponse.json({ error: 'Not your agent' }, { status: 403 });
  }

  // Verify agent is in this competition
  const ca = await prisma.competitionAgent.findUnique({
    where: { competitionId_agentId: { competitionId: id, agentId } },
  });
  if (!ca) {
    return NextResponse.json({ error: 'Agent is not in this competition' }, { status: 400 });
  }

  // Inject command into game state
  const rawGameState = (competition as any).gameState as string | null;
  if (!rawGameState) {
    return NextResponse.json({ error: 'No game state found — has the match started?' }, { status: 400 });
  }

  let gameState: any;
  try {
    gameState = JSON.parse(rawGameState);
  } catch {
    return NextResponse.json({ error: 'Game state is corrupted' }, { status: 500 });
  }

  if (!gameState.trainerCommands) gameState.trainerCommands = {};
  gameState.trainerCommands[agentId] = command.trim();

  // ── Groq: pre-interpret command into structured ShotDecision ──────────────
  // This means the trainer's command IS the agent's next move — zero extra latency on tick
  const groqKey = process.env.GROQ_API_KEY;
  let interpreted = false;

  if (groqKey && command.trim().length > 2) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Groq = require('groq-sdk').default ?? require('groq-sdk');
      const groq = new Groq({ apiKey: groqKey });
      const sport = gameState.sport ?? 'badminton';

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You interpret ${sport} trainer commands into shot decisions. Respond ONLY with JSON: { "action": "SMASH"|"DROP"|"CLEAR"|"DRIVE"|"LOB"|"BLOCK"|"SPECIAL", "targetZone": 1-9, "specialMove": null, "rationale": "one sentence" }`,
          },
          {
            role: 'user',
            content: `Trainer said: "${command.trim()}"\n\nInterpret into the best ${sport} shot.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 80,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      const validActions = ['SERVE','SMASH','DROP','CLEAR','DRIVE','LOB','BLOCK','SPECIAL'];

      if (validActions.includes(parsed.action)) {
        if (!gameState.preComputedDecisions) gameState.preComputedDecisions = {};
        gameState.preComputedDecisions[agentId] = {
          action:      parsed.action,
          targetZone:  Math.max(1, Math.min(9, Number(parsed.targetZone) || 5)),
          specialMove: parsed.specialMove ?? null,
          rationale:   `🎯 TRAINER: ${command.trim().slice(0, 60)} → ${parsed.rationale ?? parsed.action}`,
        };
        interpreted = true;
        console.log(`[trainer-cmd] Groq interpreted "${command.trim().slice(0,40)}" → ${parsed.action} zone ${parsed.targetZone}`);
      }
    } catch (err: any) {
      // Fall back to raw text injection — still works, agent reads it as text
      console.warn(`[trainer-cmd] Groq interpretation failed: ${err.message?.slice(0, 60)}`);
    }
  }

  await prisma.competition.update({
    where: { id },
    data: { gameState: JSON.stringify(gameState) },
  });

  console.log(`[trainer-cmd] ${agent.name} in ${id}: "${command.trim().slice(0, 60)}" (interpreted: ${interpreted})`);

  return NextResponse.json({
    success:    true,
    message:    `Command sent to ${agent.name}`,
    interpreted,
  });
}
