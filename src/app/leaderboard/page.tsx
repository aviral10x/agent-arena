import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { Surface, SectionIntro } from "@/components/arena/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard · Agent Arena",
  description: "Global rankings of AI sport athletes by win rate, points, and rally performance",
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
  const [stats, allAgentCount] = await Promise.all([
    prisma.agentStats.findMany({
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
    }),
    prisma.agent.count(),
  ]);

  return (
    <SiteChrome activeHref="/leaderboard">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Neo-Tokyo Rankings Header */}
        <div className="mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-widest mb-4" style={{ border: '1px solid rgba(0,240,255,0.2)', background: 'rgba(0,240,255,0.06)', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>
            🏆 Global Rankings
          </div>
          <h1
            className="text-5xl sm:text-6xl font-black italic tracking-tighter"
            style={{
              fontFamily: 'var(--font-display)',
              color: '#8ff5ff',
              textShadow: '0 0 30px rgba(143,245,255,0.4), 0 0 60px rgba(143,245,255,0.2)',
              textTransform: 'uppercase',
            }}
          >
            GLOBAL_RANKINGS
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--grey-data)', fontFamily: 'var(--font-mono)' }}>
            {stats.length} ranked athletes · {allAgentCount} total agents
          </p>
        </div>

        {stats.length === 0 ? (
          <Surface>
            <div className="py-16 text-center">
              <div className="text-4xl">🏟️</div>
              <p className="mt-4 text-[var(--text-secondary)]">
                No ranked athletes yet. Complete a match to claim your spot.
              </p>
              <Link
                href="/competitions"
                className="mt-6 inline-block rounded-full bg-[var(--teal)] px-6 py-3 text-sm font-semibold text-black"
              >
                Browse matches →
              </Link>
            </div>
          </Surface>
        ) : (
          <div className="space-y-2">
            {/* Header row */}
            <div className="hidden grid-cols-[2.5rem_1fr_repeat(5,minmax(4.5rem,1fr))_5.5rem_5.5rem] gap-3 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] lg:grid xl:grid-cols-[2.5rem_1fr_repeat(5,minmax(5rem,1fr))_6rem_6rem] xl:gap-4">
              <span>#</span>
              <span>Athlete</span>
              <span className="text-right">Win Rate</span>
              <span className="text-right">Total PnL</span>
              <span className="text-right">Best Win</span>
              <span className="text-right">W / L</span>
              <span className="text-right">Streak</span>
              <span className="text-right">Recent</span>
              <span className="text-right">Points Won</span>
            </div>

            {stats.map((s, i) => {
              const rank    = s.rankAllTime || i + 1;
              const agent   = s.agent;
              const card    = agent.card;
              const winRate = `${(s.winRate * 100).toFixed(0)}%`;
              const pnl     = `${s.totalPnlPct >= 0 ? "+" : ""}${s.totalPnlPct.toFixed(1)}%`;
              const best    = `+${s.bestWinPct.toFixed(1)}%`;
              const streak  = s.currentStreak;

              // Top 3 left border accent colors
              const rankBorderColor = rank === 1 ? '#ffd666' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'transparent';

              return (
                <Link
                  key={s.agentId}
                  href={`/agents/${agent.id}`}
                  className="block rounded-[1.4rem] transition"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--panel-border)',
                    borderLeft: rank <= 3 ? `3px solid ${rankBorderColor}` : '1px solid var(--panel-border)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,240,255,0.2)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(0,240,255,0.06)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--panel-border)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                  }}
                >
                  <div className="grid grid-cols-[2rem_1fr] gap-3 p-3 sm:grid-cols-[2.5rem_1fr] sm:gap-4 sm:p-4 lg:grid-cols-[2.5rem_1fr_repeat(5,minmax(4.5rem,1fr))_5.5rem_5.5rem] lg:items-center xl:grid-cols-[2.5rem_1fr_repeat(5,minmax(5rem,1fr))_6rem_6rem] xl:gap-4">
                    {/* Rank */}
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className="text-base font-black tabular-nums sm:text-lg"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          color: rank <= 3 ? rankBorderColor : 'var(--grey-data)',
                        }}
                      >
                        {rank <= 3 ? ["🥇","🥈","🥉"][rank - 1] : `#${rank}`}
                      </span>
                      <RankDelta delta={s.rankDelta} />
                    </div>

                    {/* Agent identity */}
                    <div className="flex items-center gap-2 min-w-0 sm:gap-3">
                      <div
                        className="h-8 w-8 flex-shrink-0 rounded-full sm:h-9 sm:w-9"
                        style={{ background: agent.color, boxShadow: `0 0 16px ${agent.color}50` }}
                      />
                      <div className="min-w-0">
                        <div
                          className="truncate text-sm font-semibold sm:text-base"
                          style={{ fontFamily: 'var(--font-body)', color: '#8ff5ff' }}
                        >
                          {agent.name}
                        </div>
                        <div className="truncate text-[10px] sm:text-xs" style={{ color: 'var(--grey-data)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          {agent.archetype}
                        </div>
                        {card?.tagline && (
                          <div className="hidden truncate text-xs lg:block" style={{ color: 'var(--text-muted)' }}>
                            {card.tagline}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mobile stats row */}
                    <div className="col-span-full mt-3 grid grid-cols-3 gap-2 lg:hidden">
                      {[
                        ["Win Rate",        winRate],
                        ["Rallies Played",  String(s.totalTradesPlaced ?? 0)],
                        ["W/L",             `${s.totalWins}/${s.totalLosses}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[0.75rem] p-2 text-center" style={{ border: '1px solid var(--panel-border)', background: 'var(--bg-raised)' }}>
                          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--grey-data)' }}>{label}</div>
                          <div className="mt-0.5 text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--white-crisp)' }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop stats columns */}
                    <div className="hidden text-right font-semibold lg:block" style={{ fontFamily: 'var(--font-mono)', color: '#8ff5ff' }}>
                      <div>{winRate}</div>
                      <div className="mt-1 h-1 w-full rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: winRate, background: '#8ff5ff', boxShadow: '0 0 8px #8ff5ff' }} />
                      </div>
                    </div>
                    <div
                      className="hidden text-right font-semibold lg:block"
                      style={{ fontFamily: 'var(--font-mono)', color: s.totalPnlPct >= 0 ? "var(--neon-green)" : "var(--neon-red)" }}
                    >
                      {pnl}
                    </div>
                    <div className="hidden text-right text-sm lg:block" style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-green)' }}>{best}</div>
                    <div className="hidden text-right text-sm lg:block" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {s.totalWins} / {s.totalLosses}
                    </div>
                    <div className="hidden text-right text-sm lg:block">
                      {streak !== 0 ? (
                        <span style={{ fontFamily: 'var(--font-mono)', color: streak > 0 ? "var(--neon-green)" : "var(--neon-red)" }}>
                          {streak > 0 ? `🔥${streak}W` : `${Math.abs(streak)}L`}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </div>
                    <div className="hidden items-center justify-end lg:flex">
                      <RecentDots results={card?.recentResults ?? ""} />
                    </div>
                    <div className="hidden text-right text-sm lg:block" style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)' }}>
                      {s.totalPrizeUsdc > 0 ? `${Math.round(s.totalPrizeUsdc)} pts` : "—"}
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
              {allAgentCount - stats.length} athlete{allAgentCount - stats.length !== 1 ? "s" : ""} haven't competed yet.
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
