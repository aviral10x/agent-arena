/**
 * Tournament lifecycle management
 * - Auto-create recurring tournaments (Friday Royale, etc.)
 * - Enrollment with x402 payment verification
 * - Auto-start when full, auto-settle when done
 * - Prize distribution
 */

import { prisma } from './db';

// ── Create a tournament ───────────────────────────────────────────────────────
export async function createTournament(opts: {
  title:         string;
  description?:  string;
  mode:          'royale' | '1v1_ladder' | 'grand_prix';
  startAt:       Date;
  endAt?:        Date;
  entryFeeUsdc:  number;
  prizePoolUsdc: number;
  maxAgents:     number;
  isRecurring?:  boolean;
  recurringTag?: string;
  featuredImage?: string;
}) {
  const enrollmentOpensAt = new Date(opts.startAt.getTime() - 24 * 3600 * 1000); // 24h before

  return prisma.tournament.create({
    data: {
      title:             opts.title,
      description:       opts.description ?? '',
      mode:              opts.mode,
      status:            'upcoming',
      enrollmentOpensAt,
      startAt:           opts.startAt,
      endAt:             opts.endAt ?? null,
      entryFeeUsdc:      opts.entryFeeUsdc,
      prizePoolUsdc:     opts.prizePoolUsdc,
      maxAgents:         opts.maxAgents,
      isRecurring:       opts.isRecurring ?? false,
      recurringTag:      opts.recurringTag ?? null,
      featuredImage:     opts.featuredImage ?? null,
    },
  });
}

// ── Auto-create next Friday Royale if none scheduled ─────────────────────────
export async function ensureFridayRoyale() {
  // Check if one already exists in the future
  const existing = await prisma.tournament.findFirst({
    where: {
      recurringTag: 'friday-royale',
      status:       { in: ['upcoming', 'enrolling', 'live'] },
      startAt:      { gt: new Date() },
    },
  });
  if (existing) return existing;

  // Create for next Friday 20:00 UTC
  const now    = new Date();
  const friday = new Date(now);
  const day    = friday.getDay(); // 0=Sun, 5=Fri
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  friday.setDate(friday.getDate() + daysUntilFriday);
  friday.setUTCHours(20, 0, 0, 0);

  return createTournament({
    title:        `Friday Royale — ${friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    description:  'Weekly 8-agent royale. Equal capital. Best AI wins the pot.',
    mode:         'royale',
    startAt:      friday,
    entryFeeUsdc: 1,
    prizePoolUsdc: 100,
    maxAgents:    8,
    isRecurring:  true,
    recurringTag: 'friday-royale',
  });
}

// ── Enroll an agent in a tournament ──────────────────────────────────────────
export async function enrollAgent(
  tournamentId: string,
  agentId:      string,
  txSignature:  string
): Promise<{ ok: boolean; error?: string }> {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return { ok: false, error: 'Tournament not found' };
  if (!['upcoming', 'enrolling'].includes(tournament.status)) {
    return { ok: false, error: `Tournament is ${tournament.status}` };
  }
  if (tournament.currentAgents >= tournament.maxAgents) {
    return { ok: false, error: 'Tournament is full' };
  }

  // Check not already enrolled
  const existing = await prisma.tournamentSlot.findUnique({
    where: { tournamentId_agentId: { tournamentId, agentId } },
  });
  if (existing) return { ok: false, error: 'Agent already enrolled' };

  await prisma.$transaction([
    prisma.tournamentSlot.create({
      data: {
        tournamentId, agentId,
        entryPaid: true, entryTxSig: txSignature, entryPaidAt: new Date(),
      },
    }),
    prisma.tournament.update({
      where: { id: tournamentId },
      data:  {
        currentAgents: { increment: 1 },
        status: tournament.currentAgents + 1 >= tournament.maxAgents
          ? 'live' : 'enrolling',
        prizePoolUsdc: tournament.prizePoolUsdc + tournament.entryFeeUsdc * 0.9, // 90% of fees go to prize pool
      },
    }),
  ]);

  // If now full → auto-start (create competition)
  const updated = await prisma.tournament.findUnique({
    where: { id: tournamentId }, include: { slots: true },
  });
  if (updated?.status === 'live' && updated.slots.length >= updated.maxAgents) {
    await startTournamentCompetition(tournamentId);
  }

  return { ok: true };
}

// ── Start the competition when a tournament is full ──────────────────────────
async function startTournamentCompetition(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }, include: { slots: true },
  });
  if (!tournament) return;

  const competition = await prisma.competition.create({
    data: {
      title:           tournament.title,
      mode:            tournament.mode === 'royale' ? 'royale' : '1v1',
      status:          'live',
      durationSeconds: 3600,
      duration:        '1 hour',
      countdown:       '1:00:00 remaining',
      entryFee:        `$${tournament.entryFeeUsdc} x402`,
      prizePool:       `$${tournament.prizePoolUsdc.toFixed(0)} USDC`,
      spectators:      0,
      track:           `${tournament.mode} match`,
      premise:         tournament.description,
      startedAt:       new Date(),
      tournamentId,
      bettingOpen:     true,
      bettingClosedAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min betting window
      agents: {
        create: tournament.slots.map(slot => ({
          agentId:           slot.agentId,
          portfolio:         tournament.entryFeeUsdc * 10, // 10x leverage for drama
          startingPortfolio: tournament.entryFeeUsdc * 10,
        })),
      },
    },
  });

  console.log(`[tournament] Started competition ${competition.id} for tournament ${tournamentId}`);
  return competition;
}

// ── Settle a tournament after all competitions done ───────────────────────────
export async function settleTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where:   { id: tournamentId },
    include: { slots: true, competitions: { include: { agents: true } } },
  });
  if (!tournament) return;

  // Find winner = agent with highest PnL across all tournament competitions
  const pnlByAgent: Record<string, number> = {};
  for (const comp of tournament.competitions) {
    for (const ca of comp.agents) {
      pnlByAgent[ca.agentId] = (pnlByAgent[ca.agentId] ?? 0) + ca.pnlPct;
    }
  }

  const [[winnerId]] = Object.entries(pnlByAgent).sort(([, a], [, b]) => b - a);

  // Calculate prizes (winner 60%, 2nd 30%, 3rd 10% for royale)
  const prizeMap: Record<number, number> = { 1: 0.6, 2: 0.3, 3: 0.1 };
  const ranked = Object.entries(pnlByAgent).sort(([, a], [, b]) => b - a);

  await prisma.$transaction([
    prisma.tournament.update({
      where: { id: tournamentId },
      data:  { status: 'settled', winnerId, endAt: new Date() },
    }),
    ...ranked.slice(0, 3).map(([agentId], idx) =>
      prisma.tournamentSlot.updateMany({
        where: { tournamentId, agentId },
        data:  {
          finalRank: idx + 1,
          prizeUsdc: tournament.prizePoolUsdc * (prizeMap[idx + 1] ?? 0),
        },
      })
    ),
  ]);

  console.log(`[tournament] Settled ${tournamentId}. Winner: ${winnerId}`);
}

// ── Get upcoming tournaments ───────────────────────────────────────────────────
export async function getUpcomingTournaments() {
  return prisma.tournament.findMany({
    where:   { status: { in: ['upcoming', 'enrolling'] } },
    include: { slots: { include: { agent: true } } },
    orderBy: { startAt: 'asc' },
    take:    10,
  });
}

export async function getLiveTournaments() {
  return prisma.tournament.findMany({
    where:   { status: 'live' },
    include: { slots: true, competitions: true },
  });
}
