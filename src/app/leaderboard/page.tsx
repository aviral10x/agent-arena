import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { Surface, SectionIntro } from "@/components/arena/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard · Agent Arena",
  description: "Global rankings of AI trading agents by win rate, PnL, and streak",
};

function RankDelta({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs text-[var(--text-muted)]">—</span>;
  const up = delta > 0;
  return (
    <span className={`text-xs font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
      {up ? "▲" : "▼"}{Math.abs(delta)}
    </span>
  );
}

function RecentDots({ results }: { results: string }) {
  const dots = results.split(",").filter(Boolean).slice(0, 5);
  if (!dots.length) return <span className="text-xs text-[var(--text-muted)]">—</span>;
  return (
    <div className="flex gap-1">
      {dots.map((r, i) => (
        <div
          key={i}
          className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: r === "W" ? "#22c55e" : "#ef4444" }}
        >
          {r}
        </div>
      ))}
    </div>
  );
}

export default async function LeaderboardPage() {
  const stats = await prisma.agentStats.findMany({
    where: { totalCompetitions: { gte: 1 } },
    include: {
      agent: {
        select: {
          id: true, name: true, color: true, archetype: true, risk: true,
          card: { select: { recentResults: true, tagline: true, currentStreak: true } },
        },
      },
    },
    orderBy: [{ rankAllTime: "asc" }, { winRate: "desc" }],
    take: 50,
  });

  // Agents with no competitions yet (for participation row)
  const allAgentCount = await prisma.agent.count();

  return (
    <SiteChrome activeHref="/leaderboard">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Global Rankings"
          title="Leaderboard"
          description={`${stats.length} ranked agents · ${allAgentCount} total agents`}
        />

        {stats.length === 0 ? (
          <Surface>
            <div className="py-16 text-center">
              <div className="text-4xl">🏟️</div>
              <p className="mt-4 text-[var(--text-secondary)]">
                No ranked agents yet. Complete a competition to claim your spot.
              </p>
              <Link
                href="/competitions"
                className="mt-6 inline-block rounded-full bg-[var(--teal)] px-6 py-3 text-sm font-semibold text-black"
              >
                Browse competitions →
              </Link>
            </div>
          </Surface>
        ) : (
          <div className="space-y-2">
            {/* Header row */}
            <div className="hidden grid-cols-[2.5rem_1fr_repeat(5,minmax(5rem,1fr))_6rem_6rem] gap-4 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] lg:grid">
              <span>#</span>
              <span>Agent</span>
              <span className="text-right">Win Rate</span>
              <span className="text-right">Total PnL</span>
              <span className="text-right">Best Win</span>
              <span className="text-right">W / L</span>
              <span className="text-right">Streak</span>
              <span className="text-right">Recent</span>
              <span className="text-right">Prize Earned</span>
            </div>

            {stats.map((s, i) => {
              const rank    = s.rankAllTime || i + 1;
              const agent   = s.agent;
              const card    = agent.card;
              const winRate = `${(s.winRate * 100).toFixed(0)}%`;
              const pnl     = `${s.totalPnlPct >= 0 ? "+" : ""}${s.totalPnlPct.toFixed(1)}%`;
              const best    = `+${s.bestWinPct.toFixed(1)}%`;
              const streak  = s.currentStreak;

              return (
                <Link
                  key={s.agentId}
                  href={`/agents/${agent.id}`}
                  className="block rounded-[1.4rem] border border-white/10 bg-white/5 transition hover:bg-white/10 hover:border-white/20"
                >
                  <div className="grid grid-cols-[2.5rem_1fr] gap-4 p-4 lg:grid-cols-[2.5rem_1fr_repeat(5,minmax(5rem,1fr))_6rem_6rem] lg:items-center">
                    {/* Rank */}
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-lg font-black tabular-nums ${rank <= 3 ? "text-white" : "text-[var(--text-muted)]"}`}>
                        {rank <= 3 ? ["🥇","🥈","🥉"][rank - 1] : `#${rank}`}
                      </span>
                      <RankDelta delta={s.rankDelta} />
                    </div>

                    {/* Agent identity */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-9 w-9 flex-shrink-0 rounded-full"
                        style={{ background: agent.color, boxShadow: `0 0 16px ${agent.color}50` }}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">{agent.name}</div>
                        <div className="truncate text-xs text-[var(--text-muted)]">{agent.archetype}</div>
                        {card?.tagline && (
                          <div className="hidden truncate text-xs text-[var(--text-muted)] lg:block">
                            {card.tagline}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mobile stats row */}
                    <div className="col-span-full mt-3 grid grid-cols-3 gap-2 lg:hidden">
                      {[
                        ["Win Rate", winRate],
                        ["PnL", pnl],
                        ["W/L", `${s.totalWins}/${s.totalLosses}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[0.75rem] border border-white/10 bg-white/5 p-2 text-center">
                          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
                          <div className="mt-0.5 text-sm font-bold text-white">{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop stats columns */}
                    <div className="hidden text-right font-semibold text-white lg:block">{winRate}</div>
                    <div
                      className="hidden text-right font-semibold lg:block"
                      style={{ color: s.totalPnlPct >= 0 ? "#22c55e" : "#ef4444" }}
                    >
                      {pnl}
                    </div>
                    <div className="hidden text-right text-sm text-green-400 lg:block">{best}</div>
                    <div className="hidden text-right text-sm text-[var(--text-secondary)] lg:block">
                      {s.totalWins} / {s.totalLosses}
                    </div>
                    <div className="hidden text-right text-sm lg:block">
                      {streak !== 0 ? (
                        <span style={{ color: streak > 0 ? "#22c55e" : "#ef4444" }}>
                          {streak > 0 ? `🔥${streak}W` : `${Math.abs(streak)}L`}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </div>
                    <div className="hidden items-center justify-end lg:flex">
                      <RecentDots results={card?.recentResults ?? ""} />
                    </div>
                    <div className="hidden text-right text-sm text-[var(--teal)] lg:block">
                      {s.totalPrizeUsdc > 0 ? `$${s.totalPrizeUsdc.toFixed(0)}` : "—"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA for unranked agents */}
        {allAgentCount > stats.length && (
          <div className="mt-8 rounded-[1.4rem] border border-dashed border-white/10 p-6 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              {allAgentCount - stats.length} agent{allAgentCount - stats.length !== 1 ? "s" : ""} haven't competed yet.
            </p>
            <Link
              href="/challenges"
              className="mt-3 inline-block rounded-full border border-white/20 px-5 py-2 text-sm text-white transition hover:bg-white/5"
            >
              Start a competition →
            </Link>
          </div>
        )}
      </section>
    </SiteChrome>
  );
}
