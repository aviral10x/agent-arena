import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { ButtonLink, Surface, StatusPill } from "@/components/arena/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
      <div className="flex-1 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-4 font-mono text-[9px] text-[var(--text-muted)] text-right">{value.toFixed(0)}</span>
    </div>
  );
}

export default async function AgentsPage() {
  const agentRecords = await prisma.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      competitions: {
        include: { competition: true },
        orderBy: { competition: { createdAt: "desc" } },
        take: 5,
      },
      stats: true,
      card: true,
    },
  });

  const agents = agentRecords.map((a: any) => {
    const settled = a.competitions.filter((ca: any) => ca.competition.status === "settled");
    const wins = settled.filter((ca: any) => ca.competition.winnerId === a.id).length;
    const winRate = settled.length > 0 ? `${Math.round((wins / settled.length) * 100)}%` : "—";
    const latestComp = a.competitions[0] ?? null;
    return {
      ...a,
      traits: (() => { try { return JSON.parse(a.traits); } catch { return []; } })(),
      specialMoves: (() => { try { return JSON.parse(a.specialMoves ?? "[]"); } catch { return []; } })(),
      latestCompetition: latestComp,
      rallyWinRate: winRate,
      totalMatches: settled.length,
      wins,
    };
  });

  return (
    <SiteChrome activeHref="/agents/create">
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8 lg:pb-28 lg:pt-16">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="fade-up mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <div className="min-w-0 flex-1">
            {/* Eyebrow pill */}
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-[var(--teal)] sm:px-4 sm:py-2 sm:text-xs">
              Athlete roster
            </div>

            <h1 className="mt-3 text-[clamp(1.4rem,4vw,2.25rem)] font-semibold tracking-[-0.05em] text-white sm:mt-4">
              All agents
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:mt-3 sm:text-base sm:leading-7">
              {agents.length} agent{agents.length !== 1 ? "s" : ""} in the arena.{" "}
              Each one is an AI sport athlete with a unique play style and physical stats.
            </p>
          </div>

          <div className="shrink-0">
            <ButtonLink href="/agents/create">Build new agent</ButtonLink>
          </div>
        </div>

        {/* ── Empty state ────────────────────────────────────────────── */}
        {agents.length === 0 && (
          <Surface>
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="text-4xl">🏸</div>
              <p className="text-sm text-[var(--text-muted)]">No athletes yet. Be the first to build one.</p>
              <ButtonLink href="/agents/create">Create athlete</ButtonLink>
            </div>
          </Surface>
        )}

        {/* ── Agent grid ─────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {agents.map((agent: any) => {
            const comp = agent.latestCompetition;
            const ca   = comp;
            const isSport = comp ? (comp.competition as any)?.type === "sport" : true;

            return (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="group glass-panel flex flex-col rounded-[1.4rem] p-4 transition hover:bg-white/[0.06] sm:rounded-[1.6rem] sm:p-5 lg:p-6"
              >
                {/* ── Avatar + name + win rate ──────────────────── */}
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                    <div
                      className="h-9 w-9 shrink-0 rounded-full sm:h-10 sm:w-10"
                      style={{
                        background: `radial-gradient(circle at 35% 35%, ${agent.color}cc, ${agent.color}44)`,
                      }}
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-white transition-colors group-hover:text-[var(--teal)] sm:text-base">
                        {agent.name}
                      </h2>
                      <p className="truncate text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] sm:tracking-[0.18em]">
                        {agent.archetype}
                      </p>
                    </div>
                  </div>

                  {/* Rally Win Rate */}
                  <div className="shrink-0 text-right">
                    <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-[10px] sm:tracking-[0.18em]">
                      Rally W/R
                    </div>
                    <div className="font-mono text-xs text-white sm:text-sm">
                      {agent.stats
                        ? `${(agent.stats.winRate * 100).toFixed(0)}%`
                        : agent.rallyWinRate}
                    </div>
                    {agent.totalMatches > 0 && (
                      <div className="text-[9px] text-[var(--text-muted)] sm:text-[10px]">
                        {agent.wins}W / {agent.totalMatches - agent.wins}L
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Play style bio ────────────────────────────── */}
                <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)] line-clamp-2 sm:mt-4 sm:text-sm sm:leading-6">
                  {agent.bio || agent.strategy}
                </p>

                {/* ── Sport stats bars ──────────────────────────── */}
                <div className="mt-3 space-y-1 sm:mt-4">
                  <StatBar label="SPD" value={agent.speed ?? 7} color="#66E3FF" />
                  <StatBar label="PWR" value={agent.power ?? 7} color="#f59e0b" />
                  <StatBar label="STA" value={agent.stamina ?? 7} color="#22c55e" />
                  <StatBar label="ACC" value={agent.accuracy ?? 7} color="#a78bfa" />
                </div>

                {/* ── Special moves ─────────────────────────────── */}
                {agent.specialMoves && agent.specialMoves.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {agent.specialMoves.slice(0, 2).map((move: string) => (
                      <span
                        key={move}
                        className="rounded-full border border-[var(--teal)]/25 bg-[var(--teal)]/8 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--teal)]"
                      >
                        {move}
                      </span>
                    ))}
                  </div>
                )}

                {/* ── Latest competition ────────────────────────── */}
                {comp && (
                  <div className="mt-4 flex min-w-0 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 sm:mt-5 sm:rounded-2xl sm:px-4 sm:py-3">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-[10px] sm:tracking-[0.18em]">
                        Last match
                      </div>
                      <div className="mt-0.5 truncate text-[11px] font-semibold text-white sm:text-xs">
                        {comp.competition?.title ?? "—"}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 text-right sm:gap-3">
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-[10px] sm:tracking-[0.18em]">
                          Score
                        </div>
                        <div className="font-mono text-[11px] sm:text-sm text-white">
                          {isSport
                            ? `${ca.score ?? 0} pts`
                            : `${(ca.pnlPct ?? ca.pnl ?? 0) >= 0 ? "+" : ""}${(ca.pnlPct ?? ca.pnl ?? 0).toFixed(1)}%`}
                        </div>
                      </div>
                      <StatusPill status={comp.competition?.status ?? "settled"} />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </SiteChrome>
  );
}
