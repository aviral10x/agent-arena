import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/arena/site-chrome";
import { LiveMatchWrapper } from "@/components/arena/live-match-wrapper";
import { Surface, StatusPill, ButtonLink } from "@/components/arena/ui";
import { featureRail } from "@/lib/arena-data";
import { LiveCountdown } from "@/components/arena/competition-filters";
import { X402ButtonClient } from "@/components/arena/x402-btn-client";
import { prisma } from "@/lib/db";
import type { Competition } from "@/lib/arena-data";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CompetitionPage(props: PageProps) {
  const { id } = await props.params;

  const compRecord = await prisma.competition.findUnique({
    where: { id },
    include: {
      agents: {
        include: { agent: true },
        orderBy: { score: "desc" },
      },
    },
  });

  if (!compRecord) {
    notFound();
  }

  const dbTrades = await prisma.trade.findMany({
    where: { competitionId: id },
    orderBy: { timestamp: "desc" },
    take: 50,
  });

  const competition: Competition = {
    ...compRecord,
    mode:   compRecord.mode as any,
    status: compRecord.status as any,
    // FIX 1.2: derive display string from raw volumeUsd
    volume: `$${((compRecord as any).volumeUsd / 1000).toFixed(1)}k`,
    agents: compRecord.agents.map((ca: any) => ({
      ...ca.agent,
      traits:    JSON.parse(ca.agent.traits),
      risk:      ca.agent.risk,
      pnl:       ca.pnl,
      pnlPct:    ca.pnlPct,
      trades:    ca.trades,
      portfolio: ca.portfolio,
      score:     ca.score,
    })),
  };

  const tradeFeed = dbTrades.map((t: any) => ({
    id: t.id,
    type: t.type,
    agentId: t.agentId,
    pair: t.pair,
    amount: t.amount,
    rationale: t.rationale,
    time: t.time,
    priceImpact: t.priceImpact,
  }));

  return (
    <SiteChrome activeHref="/competitions">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-6">
            <div className="glass-panel-strong rounded-[1.9rem] p-7 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status={competition.status} />
                <span className="font-mono text-sm text-[var(--text-muted)]">
                  Bout #{competition.id}
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[var(--gold)]">
                  {competition.mode}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
                  {competition.title}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
                  {competition.premise}
                </p>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  ["Countdown", competition.countdown],
                  ["Entry fee", competition.entryFee],
                  ["Prize pool", competition.prizePool],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                      {label}
                    </div>
                    <div className="mt-2 font-mono text-lg text-white">
                      {label === "Countdown" ? (
                        <LiveCountdown
                          targetText={value}
                          status={competition.status}
                          startedAt={(compRecord as any).startedAt?.toISOString()}
                          durationSeconds={(compRecord as any).durationSeconds}
                        />
                      ) : (
                        value
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {competition.status === "open" ? (
                  <X402ButtonClient
                    label="Enter a new agent"
                    amount={1}
                    redirectHref="/agents/create"
                  />
                ) : null}
                {competition.status === "live" ? (
                  <X402ButtonClient
                    label="Unlock full replay data"
                    amount={5}
                  />
                ) : competition.status === "settled" ? (
                  <Link
                    href={`/competitions/${competition.id}/replay`}
                    className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--text-primary)] transition hover:bg-white/5"
                  >
                    Open replay
                  </Link>
                ) : null}
              </div>
            </div>

            <LiveMatchWrapper
              initialCompetition={competition}
              initialTrades={tradeFeed}
            />
          </div>

          <div className="space-y-6">
            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Match context
              </div>
              <div className="mt-4 grid gap-4">
                {[
                  ["Track", competition.track],
                  ["Volume", competition.volume],
                  ["Spectators", competition.spectators.toString()],
                  ["Duration", competition.duration],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {label}
                    </div>
                    <div className="mt-2 text-sm text-white">{value}</div>
                  </div>
                ))}
              </div>
            </Surface>

            {/* Live trade feed is now handled by LiveMatchWrapper */}

            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Why it matters
              </div>
              <div className="mt-4 space-y-4">
                {featureRail.map((feature) => (
                  <div key={feature.title} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-4">
                    <div className="text-base font-semibold text-white">{feature.title}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {feature.detail}
                    </p>
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
