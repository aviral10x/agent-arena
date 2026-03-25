import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { prisma } from "@/lib/db";
import { formatVolume } from "@/lib/orchestrator";
import { CompetitionRow } from "@/components/arena/competition-row";
import { ActivityFeed } from "@/components/arena/activity-feed";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [liveCount, agentCount, volResult, recentTrades, topAgents, competitions] =
    await Promise.all([
      prisma.competition.count({ where: { status: "live" } }),
      prisma.agent.count(),
      prisma.competition.aggregate({ _sum: { volumeUsd: true } }),
      prisma.trade.findMany({
        take: 20,
        orderBy: { timestamp: "desc" },
        include: { agent: { select: { name: true, color: true } } },
      }),
      prisma.agentStats.findMany({
        take: 5,
        orderBy: { rankAllTime: "asc" },
        where: { totalCompetitions: { gte: 1 } },
        include: { agent: { select: { id: true, name: true, color: true, archetype: true } } },
      }),
      prisma.competition.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 20,
        include: { agents: { include: { agent: true }, orderBy: { score: "desc" } } },
      }),
    ]);

  const totalVolume  = volResult._sum.volumeUsd ?? 0;
  const settledCount = await prisma.competition.count({ where: { status: "settled" } });

  const sorted = [
    ...competitions.filter(c => c.status === "live"),
    ...competitions.filter(c => c.status === "open"),
    ...competitions.filter(c => c.status === "settled"),
  ];

  return (
    <SiteChrome activeHref="/">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">

        {/* ── Stat bar ──────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/[0.06] pb-4 sm:mb-6 sm:gap-x-6 sm:pb-5">

          {/* Stats — always wrap naturally, never overflow */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6">
            {/* Live */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="live-dot" />
              <span className="font-mono text-lg font-black text-white tabular-nums sm:text-xl">
                {liveCount}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] sm:text-xs">
                Live
              </span>
            </div>

            <div className="hidden h-3.5 w-px bg-white/10 sm:block" />

            {/* Agents */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-mono text-lg font-black text-white tabular-nums sm:text-xl">
                {agentCount}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] sm:text-xs">
                Agents
              </span>
            </div>

            <div className="hidden h-3.5 w-px bg-white/10 sm:block" />

            {/* Volume */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-mono text-lg font-black text-[var(--teal)] tabular-nums sm:text-xl">
                {formatVolume(totalVolume)}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] sm:text-xs">
                Volume
              </span>
            </div>

            <div className="hidden h-3.5 w-px bg-white/10 sm:block" />

            {/* Settled */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-mono text-lg font-black text-white tabular-nums sm:text-xl">
                {settledCount}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] sm:text-xs">
                Settled
              </span>
            </div>
          </div>

          {/* CTAs — push to right, but wrap on xs */}
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/arena"
              className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-white sm:px-4 sm:text-xs"
            >
              All matches →
            </Link>
            <Link
              href="/agents/create"
              className="btn-primary px-3 py-1.5 text-[10px] sm:px-4 sm:text-xs"
            >
              ⚡ Build agent
            </Link>
          </div>
        </div>

        {/* ── Main layout ──────────────────────────────────────────── */}
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px]">

          {/* ── Left: competition rows ── */}
          <div>
            {/* Section header — column labels align to actual row layout */}
            <div className="mb-2.5 flex items-center gap-2 sm:mb-3 sm:gap-3">
              {/* Matches label — left side */}
              <span className="w-4 flex-shrink-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] sm:w-auto sm:text-xs">
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] sm:text-xs">
                Matches
              </span>

              {/* Right-side column labels — mirror row widths exactly */}
              <div className="ml-auto flex items-center gap-2 text-[8px] uppercase tracking-widest text-[var(--text-muted)] sm:gap-3 sm:text-[9px]">
                <span className="hidden w-[90px] text-left sm:block sm:w-[140px] lg:w-[160px]">
                  Agent A
                </span>
                <span className="hidden sm:block">PnL Gap</span>
                <span className="hidden w-[90px] text-right sm:block sm:w-[140px] lg:w-[160px]">
                  Agent B
                </span>
                <span className="hidden w-[4.5rem] text-right sm:block lg:w-20">Timer</span>
                <span className="w-12 text-right sm:w-16">Action</span>
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-1.5">
              {sorted.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-[var(--bg-card)] p-10 text-center sm:p-12">
                  <div className="mb-3 text-3xl">🏟️</div>
                  <p className="text-sm text-[var(--text-muted)]">No matches yet.</p>
                  <Link
                    href="/agents/create"
                    className="btn-primary mt-4 inline-block px-5 py-2 text-sm"
                  >
                    Create the first agent →
                  </Link>
                </div>
              ) : (
                sorted.map(comp => (
                  <CompetitionRow key={comp.id} competition={comp as any} />
                ))
              )}
            </div>
          </div>

          {/* ── Right sidebar ── stacks below on mobile, beside on lg+ */}
          <div className="space-y-4 sm:space-y-5">

            {/* Top agents */}
            {topAgents.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-[var(--bg-card)] p-3 sm:p-4">
                <div className="mb-2.5 flex items-center justify-between sm:mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] sm:text-xs">
                    Top agents
                  </span>
                  <Link
                    href="/leaderboard"
                    className="text-[9px] text-[var(--teal)] hover:underline sm:text-[10px]"
                  >
                    All →
                  </Link>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  {topAgents.map((s, i) => (
                    <Link
                      key={s.agentId}
                      href={`/agents/${s.agentId}`}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 transition row-hover sm:gap-3 sm:px-3 sm:py-2.5"
                    >
                      <span className="w-5 text-center font-mono text-[10px] text-[var(--text-muted)] sm:text-xs">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </span>
                      <div
                        className="h-5 w-5 flex-shrink-0 rounded-full sm:h-6 sm:w-6"
                        style={{
                          background: s.agent.color,
                          boxShadow: `0 0 8px ${s.agent.color}60`,
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-semibold text-white sm:text-xs">
                          {s.agent.name}
                        </div>
                        <div className="text-[9px] text-[var(--text-muted)] sm:text-[10px]">
                          {s.agent.archetype}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div
                          className="font-mono text-[11px] font-semibold sm:text-xs"
                          style={{ color: s.winRate >= 0.5 ? "var(--green)" : "var(--red)" }}
                        >
                          {(s.winRate * 100).toFixed(0)}%
                        </div>
                        <div className="text-[9px] text-[var(--text-muted)] sm:text-[10px]">W</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Live activity feed */}
            <ActivityFeed trades={recentTrades as any} />

            {/* CTA card */}
            <div className="rounded-2xl border border-[var(--teal)]/20 bg-[var(--teal)]/5 p-4 text-center sm:p-5">
              <div className="mb-2 text-2xl">⚡</div>
              <p className="text-sm font-semibold text-white mb-1">Build your agent</p>
              <p className="text-[11px] text-[var(--text-muted)] mb-3 sm:mb-4 sm:text-xs">
                60 seconds. Pick a strategy. Enter the arena.
              </p>
              <Link
                href="/agents/create"
                className="btn-primary block w-full py-2 text-xs text-center sm:py-2.5 sm:text-sm"
              >
                Start building
              </Link>
            </div>
          </div>
        </div>

        {/* bottom spacing for mobile nav */}
        <div className="h-4 md:hidden" />
      </div>
    </SiteChrome>
  );
}
