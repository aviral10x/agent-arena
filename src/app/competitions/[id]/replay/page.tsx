import Link from "next/link";
import { notFound } from "next/navigation";
import { ReplayArena } from "@/components/arena/replay-arena";
import { SiteChrome } from "@/components/arena/site-chrome";
import { TradeTimeline } from "@/components/arena/trade-timeline";
import { Surface, StatusPill, ButtonLink } from "@/components/arena/ui";
import { buildArenaReplayState } from "@/lib/arena-replay";
import { prisma } from "@/lib/db";
import type { Competition, TradeEvent } from "@/lib/arena-data";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function ReplayPage({ params }: PageProps) {
  const { id } = await params;

  // FIX 4.3: fetch real competition + trade history from DB
  const [compRecord, dbTrades] = await Promise.all([
    prisma.competition.findUnique({
      where: { id },
      include: {
        agents: { include: { agent: true }, orderBy: { score: "desc" } },
      },
    }),
    prisma.trade.findMany({
      where: { competitionId: id },
      include: { agent: true },
      orderBy: { timestamp: "asc" }, // chronological for replay
    }),
  ]);

  if (!compRecord) notFound();

  const competition: Competition = {
    ...compRecord,
    mode:   compRecord.mode as any,
    status: compRecord.status as any,
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

  const tradeFeed: TradeEvent[] = dbTrades.map((t: any) => ({
    id:          t.id,
    type:        t.type,
    agentId:     t.agentId,
    agentName:   t.agent?.name ?? t.agentId,
    pair:        t.pair,
    amount:      t.amount,
    rationale:   t.rationale,
    priceImpact: t.priceImpact,
    timestamp:   t.timestamp,
    time:        t.time ?? "",
  }));

  const replay = buildArenaReplayState(competition, tradeFeed);

  // Group trades into highlight moments (every 5th trade is a "moment")
  const highlights = dbTrades
    .filter((_: any, i: number) => i % Math.max(1, Math.floor(dbTrades.length / 3)) === 0)
    .slice(0, 3)
    .map((t: any) => ({
      title: `${t.type} · ${t.pair}`,
      detail: t.rationale,
    }));

  const finalStandings = [...competition.agents].sort(
    (a, b) => b.portfolio - a.portfolio
  );

  const winner = compRecord.winnerId
    ? competition.agents.find(a => a.id === compRecord.winnerId)
    : finalStandings[0];

  return (
    <SiteChrome activeHref="/competitions">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="space-y-6">

          {/* Header */}
          <div className="glass-panel-strong rounded-[1.4rem] p-5 sm:rounded-[1.9rem] sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status="settled" />
              <span className="font-mono text-sm text-[var(--text-muted)]">
                Replay · bout #{competition.id}
              </span>
            </div>
            <h1 className="mt-5 text-[clamp(1.35rem,3.5vw,2.25rem)] font-semibold tracking-[-0.05em] text-white">
              {competition.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              {competition.premise}
            </p>

            {winner && (
              <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold-soft)] px-5 py-3">
                <span className="text-xs uppercase tracking-[0.22em] text-[var(--gold)]">Winner</span>
                <span className="font-semibold text-white">{winner.name}</span>
                <span className="font-mono text-sm text-[var(--green)]">
                  ${finalStandings[0]?.portfolio.toFixed(2)}
                </span>
              </div>
            )}

            <div className="mt-5 sm:mt-7 flex flex-wrap gap-3">
              <ButtonLink href={`/competitions/${competition.id}`}>Back to arena</ButtonLink>
              <Link
                href="/agents/create"
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--text-primary)] transition hover:bg-white/5"
              >
                Build challenger
              </Link>
            </div>
          </div>

          <ReplayArena
            key={`${replay.meta.competitionId}-${replay.meta.blockNumberSeed}`}
            replay={replay}
          />

          <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Full trade history */}
            <TradeTimeline trades={tradeFeed} title="Settled trade chronology" />

            <div className="space-y-6">
              {/* Key moments derived from real trades */}
              {highlights.length > 0 && (
                <Surface>
                  <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    Key moments
                  </div>
                  <div className="mt-4 space-y-4">
                    {highlights.map((moment: any, i: number) => (
                      <div key={i} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-sm sm:text-base font-semibold text-white">{moment.title}</div>
                          <div className="font-mono text-sm text-[var(--gold)]">0{i + 1}</div>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{moment.detail}</p>
                      </div>
                    ))}
                  </div>
                </Surface>
              )}

              {/* Final standings */}
              <Surface>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                  Final standings
                </div>
                <div className="mt-4 grid gap-3">
                  {finalStandings.map((agent, i) => (
                    <div key={agent.id} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {agent.name}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            {agent.trades} trades · {agent.archetype}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg text-white">
                            ${agent.portfolio.toFixed(2)}
                          </div>
                          <div
                            className="font-mono text-sm"
                            style={{ color: ((agent as any).pnlPct ?? agent.pnl) >= 0 ? "var(--green)" : "var(--red)" }}
                          >
                            {((agent as any).pnlPct ?? agent.pnl) >= 0 ? "+" : ""}
                            {((agent as any).pnlPct ?? agent.pnl).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
