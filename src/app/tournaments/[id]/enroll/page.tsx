import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/arena/site-chrome";
import { ButtonLink, SectionIntro, StatusPill, Surface } from "@/components/arena/ui";
import { TournamentEnrollClient } from "@/components/arena/tournament-enroll-client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { title: true },
  });

  return {
    title: tournament ? `Enroll · ${tournament.title}` : "Enroll · Agent Arena",
  };
}

export default async function TournamentEnrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      competitions: {
        select: { id: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      slots: {
        orderBy: { enrolledAt: "asc" },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              color: true,
              archetype: true,
            },
          },
        },
      },
    },
  });

  if (!tournament) {
    notFound();
  }

  const enrolledAgentIds = tournament.slots.map((slot) => slot.agentId);
  const availableAgents = await prisma.agent.findMany({
    where: enrolledAgentIds.length > 0 ? { id: { notIn: enrolledAgentIds } } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      archetype: true,
      color: true,
      bio: true,
      risk: true,
      winRate: true,
    },
    take: 24,
  });

  const now = new Date();
  const spotsLeft = Math.max(0, tournament.maxAgents - tournament.currentAgents);
  const enrollmentOpen = now >= tournament.enrollmentOpensAt;
  const isLive = tournament.status === "live";
  const isSettled = tournament.status === "settled";
  const displayStatus =
    tournament.status === "upcoming" && enrollmentOpen ? "enrolling" : tournament.status;

  let disabledReason: string | undefined;
  if (isSettled) {
    disabledReason = "This tournament is already settled.";
  } else if (isLive) {
    disabledReason = "This bracket is already live. Watch it from the arena instead.";
  } else if (!enrollmentOpen) {
    disabledReason = `Enrollment opens on ${new Date(tournament.enrollmentOpensAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}.`;
  } else if (spotsLeft === 0) {
    disabledReason = "All slots are already filled.";
  } else if (availableAgents.length === 0) {
    disabledReason = "Every existing agent is already enrolled or unavailable.";
  }

  const canEnroll = !disabledReason;
  const liveCompetition = tournament.competitions[0] ?? null;

  return (
    <SiteChrome activeHref="/tournaments">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <SectionIntro
          eyebrow="Tournament Entry"
          title={tournament.title}
          description="Lock in one of your agents, sign the X Layer testnet USDC authorization, and let the bracket spin up automatically once the slots fill."
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,420px)]">
          <div className="space-y-6">
            <TournamentEnrollClient
              tournament={{
                id: tournament.id,
                title: tournament.title,
                entryFeeUsdc: tournament.entryFeeUsdc,
                arenaWallet: (process.env.NEXT_PUBLIC_ARENA_WALLET ??
                  "0x0000000000000000000000000000000000000000") as `0x${string}`,
              }}
              agents={availableAgents}
              canEnroll={canEnroll}
              disabledReason={disabledReason}
            />
          </div>

          <div className="space-y-6">
            <Surface className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    Tournament state
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-white">Bracket snapshot</h2>
                </div>
                <StatusPill
                  status={isLive ? "live" : isSettled ? "settled" : "open"}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Entry fee", value: `$${tournament.entryFeeUsdc.toFixed(2)}` },
                  { label: "Prize pool", value: `$${tournament.prizePoolUsdc.toFixed(2)}` },
                  { label: "Filled slots", value: `${tournament.currentAgents}/${tournament.maxAgents}` },
                  { label: "Spots left", value: `${spotsLeft}` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1rem] border border-white/10 bg-white/5 p-3"
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {item.label}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                <p>
                  Enrollment opens{" "}
                  <span className="text-white">
                    {new Date(tournament.enrollmentOpensAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  .
                </p>
                <p>
                  Start time{" "}
                  <span className="text-white">
                    {new Date(tournament.startAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  .
                </p>
                <p>
                  Status resolves as <span className="text-white">{displayStatus}</span> once the
                  enrollment window is open.
                </p>
              </div>

              {liveCompetition && (
                <Link
                  href={`/competitions/${liveCompetition.id}`}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--teal)]/30 px-5 py-2.5 text-sm font-semibold text-[var(--teal)] transition hover:bg-[var(--teal)]/10"
                >
                  Open live competition
                </Link>
              )}
            </Surface>

            <Surface className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    Entrants
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-white">
                    {tournament.slots.length} locked in
                  </h2>
                </div>
                <ButtonLink href="/agents/create" variant="ghost">
                  Build agent
                </ButtonLink>
              </div>

              {tournament.slots.length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-white/10 px-4 py-5 text-sm text-[var(--text-secondary)]">
                  No entrants yet. The first bot in gets pole position.
                </div>
              ) : (
                <div className="space-y-3">
                  {tournament.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-[1rem] border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: slot.agent.color }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">
                            {slot.agent.name}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            {slot.agent.archetype}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Surface>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
