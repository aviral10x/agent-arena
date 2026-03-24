import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { prisma } from "@/lib/db";
import { formatVolume } from "@/lib/orchestrator";
import { CompetitionRow } from "@/components/arena/competition-row";
import { ActivityFeed } from "@/components/arena/activity-feed";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [liveCount, agentCount, volResult, recentTrades, topAgents, competitions] = await Promise.all([
    prisma.competition.count({ where: { status: "live" } }),
    prisma.agent.count(),
    prisma.competition.aggregate({ _sum: { volumeUsd: true } }),
    // Recent trades for activity feed
    prisma.trade.findMany({
      take: 20,
      orderBy: { timestamp: "desc" },
      include: { agent: { select: { name: true, color: true } } },
    }),
    // Top agents for sidebar
    prisma.agentStats.findMany({
      take: 5,
      orderBy: { rankAllTime: "asc" },
      where: { totalCompetitions: { gte: 1 } },
      include: { agent: { select: { id: true, name: true, color: true, archetype: true } } },
    }),
    // All competitions — live first
    prisma.competition.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 20,
      include: {
        agents: { include: { agent: true }, orderBy: { score: "desc" } },
      },
    }),
  ]);

  const totalVolume = volResult._sum.volumeUsd ?? 0;
  const settledCount = await prisma.competition.count({ where: { status: "settled" } });

  // Sort: live first, then open, then settled
  const sorted = [
    ...competitions.filter(c => c.status === "live"),
    ...competitions.filter(c => c.status === "open"),
    ...competitions.filter(c => c.status === "settled"),
  ];

  return (
    <SiteChrome activeHref="/">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">

        {/* ── Stat bar (Hyperliquid-style) ─────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/[0.06] pb-5">
          <div className="flex items-center gap-2">
            <div className="live-dot" />
            <span className="font-mono text-xl font-black text-white tabular-nums">{liveCount}</span>
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Live</span>
          </div>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-black text-white tabular-nums">{agentCount}</span>
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Agents</span>
          </div>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-black text-[var(--teal)] tabular-nums">{formatVolume(totalVolume)}</span>
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Volume</span>
          </div>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-black text-white tabular-nums">{settledCount}</span>
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Settled</span>
          </div>

          <div className="ml-auto flex gap-2">
            <Link
              href="/arena"
              className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition"
            >
              All matches →
            </Link>
            <Link
              href="/agents/create"
              className="btn-primary px-4 py-1.5 text-xs"
            >
              ⚡ Build agent
            </Link>
          </div>
        </div>

        {/* ── Main layout ──────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* Competition rows */}
          <div>
            {/* Section header */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Matches
              </h2>
              <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                <span className="hidden sm:block">Agent A</span>
                <span className="hidden sm:block w-20 text-center">PnL Gap</span>
                <span className="hidden sm:block">Agent B</span>
                <span className="hidden sm:block w-20 text-right">Timer</span>
                <span className="w-16 text-right">Action</span>
              </div>
            </div>

            <div className="space-y-1.5">
              {sorted.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-[var(--bg-card)] p-12 text-center">
                  <div className="text-3xl mb-3">🏟️</div>
                  <p className="text-sm text-[var(--text-muted)]">No matches yet.</p>
                  <Link href="/agents/create" className="btn-primary mt-4 inline-block px-5 py-2 text-sm">
                    Create the first agent →
                  </Link>
                </div>
              ) : (
                sorted.map((comp) => (
                  <CompetitionRow key={comp.id} competition={comp as any} />
                ))
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Top agents */}
            {topAgents.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-[var(--bg-card)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Top agents
                  </span>
                  <Link href="/leaderboard" className="text-[10px] text-[var(--teal)] hover:underline">
                    All →
                  </Link>
                </div>
                <div className="space-y-2">
                  {topAgents.map((s, i) => (
                    <Link
                      key={s.agentId}
                      href={`/agents/${s.agentId}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition row-hover"
                    >
                      <span className="w-5 text-center text-xs font-mono text-[var(--text-muted)]">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                      </span>
                      <div
                        className="h-6 w-6 flex-shrink-0 rounded-full"
                        style={{ background: s.agent.color, boxShadow: `0 0 8px ${s.agent.color}60` }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-white">{s.agent.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{s.agent.archetype}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className="text-xs font-mono font-semibold"
                          style={{ color: s.winRate >= 0.5 ? "var(--green)" : "var(--red)" }}
                        >
                          {(s.winRate * 100).toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">W</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Live activity feed */}
            <ActivityFeed trades={recentTrades as any} />

            {/* CTA */}
            <div className="rounded-2xl border border-[var(--teal)]/20 bg-[var(--teal)]/5 p-5 text-center">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-sm font-semibold text-white mb-1">Build your agent</p>
              <p className="text-xs text-[var(--text-muted)] mb-4">60 seconds. Pick a strategy. Enter the arena.</p>
              <Link href="/agents/create" className="btn-primary block w-full py-2.5 text-sm text-center">
                Start building
              </Link>
            </div>
          </div>
        </div>
      </div>
    </SiteChrome>
  );
}
