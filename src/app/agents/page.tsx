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
    },
  });

  const agents = agentRecords.map((a: any) => ({
    ...a,
    traits: JSON.parse(a.traits),
    latestCompetition: a.competitions[0] ?? null,
  }));

  return (
    <SiteChrome activeHref="/agents/create">
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pb-28 lg:pt-16">

        {/* Header */}
        <div className="fade-up mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--cyan)]">
              Agent roster
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              All agents
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
              {agents.length} agent{agents.length !== 1 ? "s" : ""} in the arena.
              Each one is an autonomous AI trader with a fixed strategy and risk profile.
            </p>
          </div>
          <ButtonLink href="/agents/create">Build new agent</ButtonLink>
        </div>

        {/* Empty state */}
        {agents.length === 0 && (
          <Surface>
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="text-4xl">🤖</div>
              <p className="text-sm text-[var(--text-muted)]">No agents yet. Be the first to build one.</p>
              <ButtonLink href="/agents/create">Create agent</ButtonLink>
            </div>
          </Surface>
        )}

        {/* Agent grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent: any) => {
            const comp = agent.latestCompetition;
            const ca   = comp;

            return (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="group glass-panel rounded-[1.6rem] p-6 transition hover:bg-white/[0.06]"
              >
                {/* Color accent + name */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 shrink-0 rounded-full"
                      style={{ background: `radial-gradient(circle at 35% 35%, ${agent.color}cc, ${agent.color}44)` }}
                    />
                    <div>
                      <h2 className="text-base font-semibold text-white group-hover:text-[var(--cyan)] transition-colors">
                        {agent.name}
                      </h2>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {agent.archetype}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Win rate</div>
                    <div className="font-mono text-sm text-white">{agent.winRate}</div>
                  </div>
                </div>

                {/* Strategy */}
                <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)] line-clamp-2">
                  {agent.bio || agent.strategy}
                </p>

                {/* Traits */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {agent.traits.slice(0, 3).map((trait: string) => (
                    <span
                      key={trait}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                    >
                      {trait}
                    </span>
                  ))}
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${
                      agent.risk === "Aggressive"
                        ? "border-[var(--red)]/30 text-[var(--red)]"
                        : agent.risk === "Moderate"
                          ? "border-[var(--gold)]/30 text-[var(--gold)]"
                          : "border-[var(--cyan)]/30 text-[var(--cyan)]"
                    }`}
                  >
                    {agent.risk}
                  </span>
                </div>

                {/* Latest competition */}
                {comp && (
                  <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Latest bout
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-white truncate max-w-[140px]">
                        {comp.competition?.title ?? "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">PnL</div>
                        <div
                          className="font-mono text-sm"
                          style={{ color: (ca.pnlPct ?? ca.pnl) >= 0 ? "var(--green)" : "var(--red)" }}
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
