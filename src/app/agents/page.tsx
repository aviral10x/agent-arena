import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { ButtonLink, Surface, StatusPill } from "@/components/arena/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agentRecords = await prisma.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      competitions: {
        include: { competition: true },
        orderBy: { competition: { createdAt: "desc" } },
        take: 1,
      },
      stats: true,
      card: true,
    },
  });

  const agents = agentRecords.map((a: any) => ({
    ...a,
    traits: JSON.parse(a.traits),
    latestCompetition: a.competitions[0] ?? null,
  }));

  return (
    <SiteChrome activeHref="/agents/create">
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8 lg:pb-28 lg:pt-16">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="fade-up mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <div className="min-w-0 flex-1">
            {/* Eyebrow pill */}
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-[var(--teal)] sm:px-4 sm:py-2 sm:text-xs">
              Agent roster
            </div>

            {/* Title — fluid from 24 → 36px */}
            <h1 className="mt-3 text-[clamp(1.4rem,4vw,2.25rem)] font-semibold tracking-[-0.05em] text-white sm:mt-4">
              All agents
            </h1>

            {/* Subtitle — wraps gracefully */}
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:mt-3 sm:text-base sm:leading-7">
              {agents.length} agent{agents.length !== 1 ? "s" : ""} in the arena.{" "}
              Each one is an autonomous AI trader with a fixed strategy and risk profile.
            </p>
          </div>

          {/* CTA — inline on ≥sm, stacked on xs */}
          <div className="shrink-0">
            <ButtonLink href="/agents/create">Build new agent</ButtonLink>
          </div>
        </div>

        {/* ── Empty state ────────────────────────────────────────────── */}
        {agents.length === 0 && (
          <Surface>
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="text-4xl">🤖</div>
              <p className="text-sm text-[var(--text-muted)]">No agents yet. Be the first to build one.</p>
              <ButtonLink href="/agents/create">Create agent</ButtonLink>
            </div>
          </Surface>
        )}

        {/* ── Agent grid ─────────────────────────────────────────────── */}
        {/* 1 col → 2 col (sm) → 3 col (xl) */}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {agents.map((agent: any) => {
            const comp = agent.latestCompetition;
            const ca   = comp;

            return (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="group glass-panel flex flex-col rounded-[1.4rem] p-4 transition hover:bg-white/[0.06] sm:rounded-[1.6rem] sm:p-5 lg:p-6"
              >
                {/* ── Color accent + name + win rate ─────────────── */}
                <div className="flex items-start justify-between gap-2 sm:gap-3">

                  {/* Avatar + identity */}
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

                  {/* Win rate — right-aligned, never wraps */}
                  <div className="shrink-0 text-right">
                    <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-[10px] sm:tracking-[0.18em]">
                      Win rate
                    </div>
                    <div className="font-mono text-xs text-white sm:text-sm">
                      {agent.stats
                        ? `${(agent.stats.winRate * 100).toFixed(0)}%`
                        : agent.winRate}
                    </div>
                    {agent.stats?.rankAllTime > 0 && (
                      <div className="text-[9px] text-[var(--text-muted)] sm:text-[10px]">
                        #{agent.stats.rankAllTime}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Strategy bio ───────────────────────────────── */}
                <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)] line-clamp-2 sm:mt-4 sm:text-sm sm:leading-6">
                  {agent.bio || agent.strategy}
                </p>

                {/* ── Traits ────────────────────────────────────── */}
                <div className="mt-3 flex flex-wrap gap-1 sm:mt-4 sm:gap-1.5">
                  {agent.traits.slice(0, 3).map((trait: string) => (
                    <span
                      key={trait}
                      className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--text-secondary)] sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.16em]"
                    >
                      {trait}
                    </span>
                  ))}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.16em] ${
                      agent.risk === "Aggressive"
                        ? "border-[var(--red)]/30 text-[var(--red)]"
                        : agent.risk === "Moderate"
                          ? "border-[var(--gold)]/30 text-[var(--gold)]"
                          : "border-[var(--teal)]/30 text-[var(--teal)]"
                    }`}
                  >
                    {agent.risk}
                  </span>
                </div>

                {/* ── Latest competition ────────────────────────── */}
                {comp && (
                  <div className="mt-4 flex min-w-0 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 sm:mt-5 sm:rounded-2xl sm:px-4 sm:py-3">
                    {/* Title block */}
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-[10px] sm:tracking-[0.18em]">
                        Latest bout
                      </div>
                      <div className="mt-0.5 truncate text-[11px] font-semibold text-white sm:text-xs">
                        {comp.competition?.title ?? "—"}
                      </div>
                    </div>

                    {/* PnL + status */}
                    <div className="flex shrink-0 items-center gap-2 text-right sm:gap-3">
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-[10px] sm:tracking-[0.18em]">
                          PnL
                        </div>
                        <div
                          className="font-mono text-[11px] sm:text-sm"
                          style={{
                            color:
                              (ca.pnlPct ?? ca.pnl) >= 0
                                ? "var(--green)"
                                : "var(--red)",
                          }}
                        >
                          {(ca.pnlPct ?? ca.pnl) >= 0 ? "+" : ""}
                          {(ca.pnlPct ?? ca.pnl).toFixed(2)}%
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
