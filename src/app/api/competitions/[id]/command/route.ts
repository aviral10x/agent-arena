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

  if (!gameState.trainerCommands) {
    gameState.trainerCommands = {};
  }
  gameState.trainerCommands[agentId] = command.trim();

  await prisma.competition.update({
    where: { id: id },
    data: { gameState: JSON.stringify(gameState) },
  });

  console.log(`[trainer-cmd] ${agent.name} in ${id}: "${command.trim().slice(0, 60)}"`);

  return NextResponse.json({
    success: true,
    message: `Command sent to ${agent.name}`,
  });
}
