import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/arena/site-chrome";
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
    title: tournament ? `Enroll · ${tournament.title} · Agent Arena` : "Enroll · Agent Arena",
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
            select: { id: true, name: true, color: true, archetype: true },
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
      id: true, name: true, archetype: true, color: true,
      bio: true, risk: true, winRate: true,
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
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    })}.`;
  } else if (spotsLeft === 0) {
    disabledReason = "All slots are already filled.";
  } else if (availableAgents.length === 0) {
    disabledReason = "Every existing agent is already enrolled or unavailable.";
  }

  const canEnroll = !disabledReason;
  const liveCompetition = tournament.competitions[0] ?? null;

  const statusColor = isLive ? "#00f0ff" : isSettled ? "#464752" : "#ffd666";
  const statusLabel = isLive ? "LIVE" : isSettled ? "SETTLED" : spotsLeft === 0 ? "FULL" : "ENROLLING";

  return (
    <SiteChrome activeHref="/tournaments">
      <div className="scanline fixed inset-0 z-10 opacity-10 pointer-events-none" />

      <main className="pt-4 pb-24 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">

        {/* ── Hero Header ── */}
        <section className="mb-8 relative">
          <div className="absolute -left-4 top-0 w-1 h-12 bg-[#ffd666]" />
          <div className="flex items-center gap-3 mb-2">
            <Link href="/tournaments" className="text-[10px] font-mono uppercase tracking-widest text-[#464752] hover:text-[#aaaab6] transition-colors">
              ← Tournaments
            </Link>
            <span className="text-[#464752]">/</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#ffd666]">Enroll</span>
          </div>
          <h1
            className="font-['Space_Grotesk'] text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-2"
            style={{ color: "#ffd666", textShadow: "0 0 30px rgba(255,230,170,0.4)" }}
          >
            {tournament.title}
          </h1>
          <p className="font-mono text-xs text-[#464752]">
            Lock in one of your agents and enter the bracket. Match starts when all slots fill.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,420px)]">

          {/* ── Left: enrollment form ── */}
          <div>
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

          {/* ── Right: bracket snapshot + entrants ── */}
          <div className="space-y-4">

            {/* Bracket snapshot */}
            <div className="bg-[#171924] border border-[#464752]/20 border-l-2 p-5" style={{ borderLeftColor: statusColor }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752]">Bracket_Snapshot</div>
                <span
                  className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border"
                  style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}18` }}
                >
                  {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full animate-ping mr-1.5 align-middle" style={{ background: statusColor }} />}
                  {statusLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-5">
                {[
                  { label: "Entry_Fee",    value: `$${tournament.entryFeeUsdc.toFixed(2)}` },
                  { label: "Prize_Pool",   value: `$${tournament.prizePoolUsdc.toFixed(2)}` },
                  { label: "Filled_Slots", value: `${tournament.currentAgents}/${tournament.maxAgents}` },
                  { label: "Spots_Left",   value: `${spotsLeft}` },
                ].map((item) => (
                  <div key={item.label} className="bg-[#11131d] border border-[#464752]/20 p-3">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">{item.label}</div>
                    <div className="mt-1 text-sm font-bold font-mono text-[#eeecfa]">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-xs font-mono text-[#aaaab6] border-t border-[#464752]/10 pt-4">
                <p>
                  ENROLL_OPENS:{" "}
                  <span className="text-[#eeecfa]">
                    {new Date(tournament.enrollmentOpensAt).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </p>
                <p>
                  START:{" "}
                  <span className="text-[#eeecfa]">
                    {new Date(tournament.startAt).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </p>
                <p>
                  STATUS: <span className="text-[#ffd666] uppercase">{displayStatus}</span>
                </p>
              </div>

              {liveCompetition && (
                <div className="mt-4 pt-4 border-t border-[#464752]/10">
                  <Link
                    href={`/competitions/${liveCompetition.id}`}
                    className="inline-block bg-[#00f0ff] text-[#005d63] px-5 py-2 font-['Space_Grotesk'] font-black uppercase text-xs hover:skew-x-[-6deg] transition-all"
                  >
                    Watch_Live →
                  </Link>
                </div>
              )}
            </div>

            {/* Entrants */}
            <div className="bg-[#171924] border border-[#464752]/20 p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752]">Entrants</div>
                  <div className="font-['Space_Grotesk'] font-black text-sm text-[#eeecfa] uppercase mt-1">
                    {tournament.slots.length} Locked_In
                  </div>
                </div>
                <Link
                  href="/agents/create"
                  className="border border-[#00f0ff]/30 text-[#00f0ff] px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest hover:bg-[#00f0ff]/10 transition-colors"
                >
                  Build_Agent
                </Link>
              </div>

              {tournament.slots.length === 0 ? (
                <div className="border border-dashed border-[#464752]/30 px-4 py-5 text-xs font-mono text-[#464752]">
                  No entrants yet. The first bot in gets pole position.
                </div>
              ) : (
                <div className="space-y-2">
                  {tournament.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center gap-3 bg-[#11131d] border border-[#464752]/10 px-3 py-2.5"
                    >
                      <div
                        className="h-7 w-7 shrink-0 flex items-center justify-center font-['Bebas_Neue'] text-xs"
                        style={{ background: `${slot.agent.color}22`, border: `1px solid ${slot.agent.color}66`, color: slot.agent.color }}
                      >
                        {slot.agent.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-mono text-xs font-bold text-[#eeecfa] uppercase">
                          {slot.agent.name}
                        </div>
                        <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">
                          {slot.agent.archetype}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </SiteChrome>
  );
}
