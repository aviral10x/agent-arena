import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/arena/site-chrome";
import { LiveMatchWrapper } from "@/components/arena/live-match-wrapper";
import { StatusPill } from "@/components/arena/ui";
import { LiveCountdown } from "@/components/arena/competition-filters";
import { X402ButtonClient } from "@/components/arena/x402-btn-client";
import { ShareButton } from "@/components/arena/share-button";
import { BettingPanelClient } from "@/components/arena/betting-panel-client";
import { SportMatchClient } from "@/components/arena/sport-match-client";
import { prisma } from "@/lib/db";
import type { Competition } from "@/lib/arena-data";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata(props: PageProps) {
  const { id } = await props.params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://agentarena.xyz';
  return {
    openGraph: { images: [`${base}/api/og/competition/${id}`] },
    twitter: { card: 'summary_large_image', images: [`${base}/api/og/competition/${id}`] },
  };
}

export default async function CompetitionPage(props: PageProps) {
  const { id } = await props.params;

  const compRecord = await prisma.competition.findUnique({
    where: { id },
    include: { agents: { include: { agent: true }, orderBy: { score: "desc" } } },
  });

  if (!compRecord) notFound();

  const dbTrades = await prisma.trade.findMany({
    where: { competitionId: id },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

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

  const tradeFeed = dbTrades.map((t: any) => ({
    id: t.id, type: t.type, agentId: t.agentId,
    pair: t.pair, amount: t.amount, rationale: t.rationale,
    time: t.time, priceImpact: t.priceImpact,
    txHash: t.txHash ?? null, txChain: t.txChain ?? null,
    txExplorerUrl: t.txExplorerUrl ?? null,
    timestamp: t.timestamp?.toISOString() ?? new Date().toISOString(),
  }));

  const isSport = (compRecord as any).type === 'sport';
  const [agentA, agentB] = competition.agents as any[];
  const winner = competition.agents.find((a: any) => a.id === compRecord.winnerId) as any;
  const totalTrades = competition.agents.reduce((s: number, a: any) => s + (a.trades ?? 0), 0);
  const totalRallies = (compRecord as any).totalRallies ?? 0;

  return (
    <SiteChrome activeHref="/competitions">
      {/* ── COMPACT HERO STRIP ─────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] bg-[var(--bg-soft)]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">

            {/* Left: title + badges */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <StatusPill status={competition.status} />
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-[var(--gold)]">
                {competition.mode}
              </span>
              <h1 className="min-w-0 truncate text-base font-bold text-white sm:text-lg">
                {competition.title}
              </h1>
            </div>

            {/* Right: CTAs */}
            <div className="flex shrink-0 items-center gap-2">
              {competition.status === "open" && (
                <X402ButtonClient label="Enter" amount={0.01} redirectHref="/agents/create" />
              )}
              {competition.status === "live" && !isSport && (
                <X402ButtonClient label="Unlock data" amount={0.01} />
              )}
              {competition.status === "settled" && (
                <>
                  <Link href={`/competitions/${competition.id}/replay`}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/5">
                    Replay
                  </Link>
                  <ShareButton
                    url={`${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://agentarena.xyz'}/competitions/${competition.id}`}
                    text={`AI agents battled on @AgentArenaXYZ — "${competition.title}" 👇`}
                    label="Share"
                  />
                </>
              )}
            </div>
          </div>

          {/* Stats bar — always one line */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
            {/* Agent A */}
            {agentA && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ background: agentA.color }} />
                <span className="text-sm font-bold text-white">{agentA.name}</span>
                {isSport ? (
                  <span className="font-mono text-sm font-bold text-[var(--teal)]">
                    {agentA.score ?? 0} pts
                  </span>
                ) : (
                  <span className="font-mono text-sm font-bold" style={{
                    color: (agentA.pnlPct ?? 0) >= 0 ? 'var(--green)' : 'var(--red)'
                  }}>
                    {(agentA.pnlPct ?? 0) >= 0 ? '+' : ''}{(agentA.pnlPct ?? 0).toFixed(1)}%
                  </span>
                )}
                {winner?.id === agentA.id && <span className="text-[var(--gold)]">🏆</span>}
              </div>
            )}

            <span className="text-[var(--text-muted)] text-xs font-mono">VS</span>

            {/* Agent B */}
            {agentB && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ background: agentB.color }} />
                <span className="text-sm font-bold text-white">{agentB.name}</span>
                {isSport ? (
                  <span className="font-mono text-sm font-bold text-[var(--teal)]">
                    {agentB.score ?? 0} pts
                  </span>
                ) : (
                  <span className="font-mono text-sm font-bold" style={{
                    color: (agentB.pnlPct ?? 0) >= 0 ? 'var(--green)' : 'var(--red)'
                  }}>
                    {(agentB.pnlPct ?? 0) >= 0 ? '+' : ''}{(agentB.pnlPct ?? 0).toFixed(1)}%
                  </span>
                )}
                {winner?.id === agentB.id && <span className="text-[var(--gold)]">🏆</span>}
              </div>
            )}

            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <LiveCountdown
                  targetText={competition.countdown}
                  status={competition.status}
                  startedAt={(compRecord as any).startedAt?.toISOString()}
                  durationSeconds={(compRecord as any).durationSeconds}
                  compact
                />
              </div>
              {isSport ? (
                <span className="text-[11px] text-[var(--text-muted)]">{totalRallies} rallies</span>
              ) : (
                <>
                  <span className="text-[11px] text-[var(--text-muted)]">{totalTrades} trades</span>
                  <span className="text-[11px] font-mono text-[var(--teal)]">{competition.volume} vol</span>
                </>
              )}
              <span className="text-[11px] text-[var(--text-muted)]">{competition.duration}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SPORT MATCH VIEW ─────────────────────────────────────────── */}
      {(compRecord as any).type === 'sport' && (
        <SportMatchClient
          competitionId={compRecord.id}
          initialGameState={(compRecord as any).gameState ?? null}
          agents={competition.agents.map((a: any) => ({
            id: a.id, name: a.name, color: a.color, owner: a.owner ?? '',
          }))}
          status={competition.status}
          sport={(compRecord as any).sport ?? 'badminton'}
          tradeFeed={tradeFeed}
          bettingOpen={(compRecord as any).bettingOpen ?? false}
          totalBetUsdc={(compRecord as any).totalBetUsdc ?? 0}
          winnerId={compRecord.winnerId ?? null}
        />
      )}

      {/* ── MAIN DASHBOARD GRID (trading competitions) ────────────── */}
      <div className={(compRecord as any).type === 'sport' ? 'hidden' : ''}>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
        {/* 
          Layout: 
          Mobile: stacked
          Tablet (md): 2 cols — [leaderboard+portfolio | betting]
          Desktop (xl): 3 cols — [leaderboard | trade feed | betting+context]
        */}
        <div className="grid gap-4 md:grid-cols-[1fr_320px] xl:grid-cols-[300px_1fr_300px]">

          {/* ── COL 1: Leaderboard + Portfolio Bars ── */}
          <div className="flex flex-col gap-4">
            <LiveMatchWrapper
              initialCompetition={competition}
              initialTrades={tradeFeed}
              layout="leaderboard-only"
            />
          </div>

          {/* ── COL 2: Trade timeline — VERTICAL, full height ── */}
          <div className="md:col-span-1 xl:col-span-1">
            <LiveMatchWrapper
              initialCompetition={competition}
              initialTrades={tradeFeed}
              layout="timeline-only"
            />
          </div>

          {/* ── COL 3: Betting + quick stats ── */}
          <div className="flex flex-col gap-4 md:col-start-2 md:row-start-1 md:row-span-2 xl:col-start-3 xl:row-start-1 xl:row-span-1">

            {/* Betting panel */}
            <BettingPanelClient
              competitionId={compRecord.id}
              agents={competition.agents.map((a: any) => ({
                id: a.id, name: a.name, color: a.color,
                ownerWallet: a.owner ?? null,
              }))}
              bettingOpen={(compRecord as any).bettingOpen ?? false}
              totalBetUsdc={(compRecord as any).totalBetUsdc ?? 0}
              winnerId={compRecord.winnerId ?? null}
              status={competition.status}
            />

            {/* Quick stats — compact single card */}
            <div className="rounded-2xl border border-white/[0.06] bg-[var(--bg-card)] p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Match Info
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(isSport ? [
                  ["Sport",      ((compRecord as any).sport ?? 'badminton').toUpperCase()],
                  ["Rallies",    totalRallies.toString()],
                  ["Spectators", competition.spectators.toString()],
                  ["Duration",   competition.duration],
                  ["Entry",      competition.entryFee],
                  ["Prize",      competition.prizePool],
                ] : [
                  ["Track",      competition.track],
                  ["Volume",     competition.volume],
                  ["Spectators", competition.spectators.toString()],
                  ["Duration",   competition.duration],
                  ["Entry",      competition.entryFee],
                  ["Prize",      competition.prizePool],
                ]).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                    <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]">{label}</div>
                    <div className="mt-0.5 truncate text-[11px] font-semibold text-white">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div> {/* end trading-only wrapper */}
    </SiteChrome>
  );
}
