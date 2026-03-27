import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAgentWalletAddress } from '@/lib/agent-wallet';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');

    const agents = await prisma.agent.findMany({
      where: owner ? { owner: { equals: owner, mode: 'insensitive' } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(agents.map((a: any) => {
      const { walletKey: _wk, ...safe } = a;
      return { ...safe, traits: JSON.parse(a.traits) };
    }));
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const limited = checkRateLimit(request, 20, 60_000); // 20 agent creates/min
  if (limited) return limited;

  try {
    const body = await request.json();

    // Input validation
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
      return NextResponse.json({ error: 'Agent name must be at least 2 characters' }, { status: 400 });
    }
    if (body.name.length > 64) {
      return NextResponse.json({ error: 'Agent name too long (max 64 chars)' }, { status: 400 });
    }
    if (!body.archetype || !body.strategy || !body.risk) {
      return NextResponse.json({ error: 'archetype, strategy, and risk are required' }, { status: 400 });
    }

    // In production, validate x402 entry payment here before creating agent
    // For now, skip payment enforcement in demo mode
    const isDemoMode = !process.env.REQUIRE_ENTRY_FEE || process.env.REQUIRE_ENTRY_FEE !== 'true';
    if (!isDemoMode && !body.entryPaymentSignature) {
      return NextResponse.json({ error: 'Entry fee payment required (x402)' }, { status: 402 });
    }

    const bankroll = Math.min(100, Math.max(1, parseFloat(body.bankroll ?? '10')));

    // Assign the shared OKX agentic wallet address (TEE-backed, server-side signing)
    // All agents share the master wallet; individual balances tracked in DB
    const agentWalletAddr = await getAgentWalletAddress()
      ?? '0x340f34c592e9eedd71a42af6900c388032ca095a'; // fallback to known address

    const agent = await prisma.agent.create({
      data: {
        name:         body.name,
        archetype:    body.archetype,
        strategy:     body.strategy,
        risk:         body.risk,
        color:        body.color ?? '#66e3ff',
        owner:        body.owner ?? 'Anonymous',
        wallet:       agentWalletAddr,
        bio:          body.description ?? '',
        traits:       JSON.stringify(body.traits ?? []),
        speed:        body.speed    ?? 7,
        power:        body.power    ?? 7,
        stamina:      body.stamina  ?? 7,
        accuracy:     body.accuracy ?? 7,
        specialMoves: JSON.stringify(body.specialMoves ?? []),
      },
    });

    // Create AgentCard with avatar if image was generated
    if (body.avatarUrl) {
      await prisma.agentCard.upsert({
        where:  { agentId: agent.id },
        update: { avatarUrl: body.avatarUrl },
        create: { agentId: agent.id, avatarUrl: body.avatarUrl },
      }).catch(() => {}); // non-fatal
    }

    // FIX 4.1: auto-enroll into oldest open competition with a free slot
    const openComp = await prisma.competition.findFirst({
      where: { status: 'open' },
      include: { agents: true },
      orderBy: { createdAt: 'asc' },
    });

    let enrolledCompetitionId: string | null = null;

    if (openComp) {
      const maxSlots = openComp.mode === '1v1' ? 2 : 4;
      const hasSlot  = openComp.agents.length < maxSlots;

      if (hasSlot) {
        await prisma.competitionAgent.create({
          data: {
            competitionId:     openComp.id,
            agentId:           agent.id,
            portfolio:         bankroll,
            startingPortfolio: bankroll,
          },
        });
        enrolledCompetitionId = openComp.id;

        // FIX 3.3: if competition now full, flip it to live
        const freshCount = openComp.agents.length + 1; // +1 for the one we just added
        if (freshCount >= maxSlots) {
          await prisma.competition.update({
            where: { id: openComp.id },
            data:  { status: 'live', startedAt: new Date() },
          });
          console.log(`[lifecycle] Competition ${openComp.id} is now LIVE`);
        }
      }
    }

    // Never leak walletKey to the client
    const { walletKey: _wk, ...safeAgent } = agent;

    return NextResponse.json(
      {
        ...safeAgent,
        traits: JSON.parse(agent.traits),
        enrolledCompetitionId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
