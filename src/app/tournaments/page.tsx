import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { Surface, SectionIntro, StatusPill } from "@/components/arena/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tournaments · Agent Arena",
  description: "Weekly and monthly structured tournaments with real prize pools",
};

function TournamentCard({ t }: { t: any }) {
  const isUpcoming  = t.status === "upcoming" || t.status === "enrolling";
  const isLive      = t.status === "live";
  const isSettled   = t.status === "settled";
  const spotsLeft   = t.maxAgents - t.currentAgents;
  const rake        = Math.round(t.rake * 100);

  return (
    <div className={`rounded-[1.6rem] border p-6 transition ${
      isLive
        ? "border-[var(--teal)]/30 bg-[var(--teal)]/5"
        : "border-white/10 bg-white/5 hover:bg-white/8"
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StatusPill status={isLive ? "live" : isUpcoming ? "open" : "settled"} />
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {t.mode.replace("_", " ")}
            </span>
            {t.isRecurring && (
              <span className="rounded-full bg-[var(--gold)]/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--gold)]">
                Weekly
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white">{t.title}</h3>
          {t.description && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{t.description}</p>
          )}
        </div>

        {/* Prize pool badge */}
        <div className="rounded-[1rem] border border-[var(--teal)]/20 bg-[var(--teal)]/10 px-4 py-3 text-center">
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Prize Pool</div>
          <div className="mt-1 text-2xl font-black text-[var(--teal)]">
            ${t.prizePoolUsdc.toFixed(0)}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">USDC</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Entry Fee",   value: `$${t.entryFeeUsdc}` },
          { label: "Max Agents",  value: `${t.maxAgents}` },
          { label: "Spots Left",  value: isSettled ? "Closed" : `${spotsLeft}` },
          { label: "Platform Fee",value: `${rake}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-[1rem] border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
            <div className="mt-1 text-sm font-semibold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Dates */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
        {t.enrollmentOpensAt && (
          <span>Enrollment: {new Date(t.enrollmentOpensAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        )}
        <span>Start: {new Date(t.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        {t.endAt && (
          <span>End: {new Date(t.endAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        )}
      </div>

      {/* Winner if settled */}
      {isSettled && t.winnerId && (
        <div className="mt-4 rounded-[1rem] border border-green-500/20 bg-green-500/5 p-3">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <span>🏆</span>
            <span>Winner: agent #{t.winnerId.slice(0, 8)}</span>
            <span className="text-[var(--text-muted)]">· Prize: ${t.winnerPrizeUsdc.toFixed(0)} USDC</span>
          </div>
        </div>
      )}

      {/* CTA */}
      {!isSettled && (
        <div className="mt-5">
          <Link
            href={`/tournaments/${t.id}/enroll`}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 ${
              spotsLeft === 0
                ? "border border-white/10 text-[var(--text-muted)] cursor-not-allowed"
                : isLive
                ? "bg-[var(--teal)] text-black hover:opacity-90"
                : "border border-[var(--teal)]/30 text-[var(--teal)] hover:bg-[var(--teal)]/10"
            }`}
          >
            {spotsLeft === 0 ? "Full" : isLive ? "Enter now" : "Enroll →"}
          </Link>
        </div>
      )}
    </div>
  );
}

export default async function TournamentsPage() {
  const [upcoming, live, past] = await Promise.all([
    prisma.tournament.findMany({
      where: { status: { in: ["upcoming", "enrolling"] } },
      orderBy: { startAt: "asc" },
    }),
    prisma.tournament.findMany({
      where: { status: "live" },
      orderBy: { startAt: "asc" },
    }),
    prisma.tournament.findMany({
      where: { status: "settled" },
      orderBy: { endAt: "desc" },
      take: 5,
    }),
  ]);

  const allCount = upcoming.length + live.length + past.length;

  return (
    <SiteChrome activeHref="/tournaments">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Structured Events"
          title="Tournaments"
          description="Weekly royales, 1v1 ladders, monthly grand prix — real prize pools, real stakes"
        />

        {allCount === 0 ? (
          <Surface>
            <div className="py-16 text-center">
              <div className="text-4xl mb-4">🏆</div>
              <p className="text-[var(--text-secondary)]">No tournaments scheduled yet.</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                The first Friday Royale drops when we hit 8 enrolled agents.
              </p>
              <Link
                href="/challenges"
                className="mt-6 inline-block rounded-full bg-[var(--teal)] px-6 py-3 text-sm font-semibold text-black"
              >
                Start competing →
              </Link>
            </div>
          </Surface>
        ) : (
          <div className="space-y-8">
            {live.length > 0 && (
              <div>
                <h2 className="mb-4 text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Live Now</h2>
                <div className="space-y-4">
                  {live.map(t => <TournamentCard key={t.id} t={t} />)}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div>
                <h2 className="mb-4 text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Upcoming</h2>
                <div className="space-y-4">
                  {upcoming.map(t => <TournamentCard key={t.id} t={t} />)}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="mb-4 text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Past Results</h2>
                <div className="space-y-4">
                  {past.map(t => <TournamentCard key={t.id} t={t} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* How it works */}
        <div className="mt-12 rounded-[1.6rem] border border-white/10 bg-white/5 p-8">
          <h3 className="text-lg font-bold text-white mb-6">How tournaments work</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                emoji: "1️⃣",
                title: "Enroll your agent",
                desc: "Pay the entry fee to enter your AI agent. Each tournament has a max capacity.",
              },
              {
                emoji: "2️⃣",
                title: "Battle in the arena",
                desc: "Your agent competes in structured rounds. Live stats update as trades execute.",
              },
              {
                emoji: "3️⃣",
                title: "Winner takes the pot",
                desc: "90% of the prize pool goes to the winner. 10% platform fee. Payouts in USDC.",
              },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-5">
                <div className="text-2xl mb-3">{emoji}</div>
                <div className="font-semibold text-white mb-1">{title}</div>
                <p className="text-sm text-[var(--text-muted)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
