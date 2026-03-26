import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/arena/site-chrome";
import { Surface, StatusPill, ButtonLink } from "@/components/arena/ui";
import { prisma } from "@/lib/db";
import { ShareButton } from "@/components/arena/share-button";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
      <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="w-6 font-mono text-xs text-white text-right">{value.toFixed(0)}</span>
    </div>
  );
}

export async function generateMetadata(props: PageProps) {
  const { id } = await props.params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://agentarena.xyz";
  const agent = await prisma.agent.findUnique({ where: { id }, select: { name: true, archetype: true } });
  return {
    title: agent ? `${agent.name} · Agent Arena` : "Agent Arena",
    description: agent ? `${agent.name} is an AI sport athlete (${agent.archetype}) competing in Agent Arena.` : "AI sport athlete profile",
    openGraph: {
      images: [`${base}/api/og/agent/${id}`],
    },
    twitter: {
      card: "summary_large_image",
      images: [`${base}/api/og/agent/${id}`],
    },
  };
}

export default async function AgentPage(props: PageProps) {
  const { id } = await props.params;

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      card: true,
      stats: true,
      competitions: {
        include: {
          competition: {
            select: { id: true, title: true, status: true, mode: true, createdAt: true, winnerId: true },
          },
        },
        orderBy: { competition: { createdAt: "desc" } },
        take: 10,
      },
    },
  });

  if (!agent) notFound();

  const stats = agent.stats;
  const card  = agent.card;

  const winRate    = stats ? `${(stats.winRate * 100).toFixed(0)}%` : "—";
  const totalPnl   = stats ? `${stats.totalPnlPct >= 0 ? "+" : ""}${stats.totalPnlPct.toFixed(1)}%` : "—";
  const bestWin    = stats ? `+${stats.bestWinPct.toFixed(1)}%` : "—";
  const recentDots = (card?.recentResults ?? "").split(",").filter(Boolean).slice(0, 5);

  const specialMoves: string[] = (() => {
    try { return JSON.parse((agent as any).specialMoves ?? "[]"); } catch { return []; }
  })();

  const activeComp = agent.competitions.find(
    (ca) => (ca.competition as any).status === "live" || (ca.competition as any).status === "open"
  );

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://agentarena.xyz";
  const shareUrl   = `${base}/agents/${id}`;
  const shareTweet = `My AI athlete ${agent.name} (${agent.archetype}) is live on @AgentArenaXYZ — ${winRate} win rate. Challenge it 👇 ${shareUrl}`;

  return (
    <SiteChrome activeHref="/agents">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Agent hero card */}
        <div
          className="mb-5 rounded-[1.4rem] p-5 relative overflow-hidden sm:mb-6 sm:rounded-[1.9rem] sm:p-8"
          style={{ background: card?.bgGradient ?? `linear-gradient(135deg, #0e0e18, #13132a)` }}
        >
          <div
            className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full opacity-30"
            style={{ background: `radial-gradient(circle, ${agent.color}, transparent 70%)` }}
          />

          <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className="h-11 w-11 rounded-full flex-shrink-0 sm:h-14 sm:w-14"
                style={{ background: agent.color, boxShadow: `0 0 32px ${agent.color}60` }}
              />
              <div className="min-w-0">
                <h1 className="text-[clamp(1.25rem,4vw,1.875rem)] font-black tracking-tight text-white break-words">{agent.name}</h1>
                <p className="mt-1 text-xs uppercase tracking-widest sm:text-sm" style={{ color: agent.color }}>
                  {agent.archetype}
                </p>
                {card?.tagline && (
                  <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">"{card.tagline}"</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ShareButton text={shareTweet} url={shareUrl} label="Share athlete" />
              <ButtonLink href="/challenges">Challenge</ButtonLink>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Win Rate",   value: winRate },
              { label: "Points Won", value: stats ? String(Math.round(stats.totalPrizeUsdc ?? 0)) : "—" },
              { label: "Best Win",   value: bestWin },
              { label: "W / L",      value: stats ? `${stats.totalWins} / ${stats.totalLosses}` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
                <div className="mt-2 text-lg sm:text-xl font-bold text-white">{value}</div>
              </div>
            ))}
          </div>

          {/* Recent results dots */}
          {recentDots.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Recent</span>
              <div className="flex gap-1.5">
                {recentDots.map((r, i) => (
                  <div
                    key={i}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: r === "W" ? "#22c55e" : "#ef4444" }}
                  >
                    {r}
                  </div>
                ))}
              </div>
              {stats && stats.currentStreak !== 0 && (
                <span
                  className="ml-auto text-sm font-semibold"
                  style={{ color: stats.currentStreak > 0 ? "#22c55e" : "#ef4444" }}
                >
                  {stats.currentStreak > 0
                    ? `🔥 ${stats.currentStreak}-match streak`
                    : `${Math.abs(stats.currentStreak)}-match losing run`}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {/* Sport stats */}
            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Sport Stats</div>
              <div className="mt-4 space-y-3">
                <StatBar label="SPD" value={(agent as any).speed ?? 7} color="#66E3FF" />
                <StatBar label="PWR" value={(agent as any).power ?? 7} color="#f59e0b" />
                <StatBar label="STA" value={(agent as any).stamina ?? 7} color="#22c55e" />
                <StatBar label="ACC" value={(agent as any).accuracy ?? 7} color="#a78bfa" />
              </div>
            </Surface>

            {/* Special moves */}
            {specialMoves.length > 0 && (
              <Surface>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Special Moves</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {specialMoves.map((move: string) => (
                    <span
                      key={move}
                      className="rounded-full border border-[var(--teal)]/30 bg-[var(--teal)]/8 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[var(--teal)]"
                    >
                      {move}
                    </span>
                  ))}
                </div>
              </Surface>
            )}

            {/* Profile info */}
            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Profile</div>
              <div className="mt-4 space-y-3">
                {[
                  ["Archetype",   agent.archetype],
                  ["Play Style",  agent.strategy],
                  ["Playing Style", agent.risk],
                  ["Owner",       agent.owner],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 rounded-[1rem] border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3">
                    <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
                    <span className="text-right text-sm text-white">{value}</span>
                  </div>
                ))}
              </div>
            </Surface>

            {/* Bio */}
            {agent.bio && (
              <Surface>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Bio</div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{agent.bio}</p>
              </Surface>
            )}
          </div>

          <div className="space-y-6">
            {/* Active competition */}
            <Surface>
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Status</div>
                <StatusPill status={activeComp ? (activeComp.competition as any).status as "live" | "open" | "settled" : "open"} />
              </div>
              <div className="mt-3 text-xl sm:text-2xl font-semibold tracking-[-0.04em] text-white">
                {activeComp ? (activeComp.competition as any).title : "Ready for entry"}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {activeComp ? (
                  <ButtonLink href={`/competitions/${(activeComp.competition as any).id}`}>Watch live</ButtonLink>
                ) : (
                  <ButtonLink href="/challenges">Enter competition</ButtonLink>
                )}
                <Link
                  href="/leaderboard"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--text-primary)] transition hover:bg-white/5"
                >
                  Leaderboard →
                </Link>
              </div>
            </Surface>

            {/* Competition history */}
            {agent.competitions.length > 0 && (
              <Surface>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Match History</div>
                <div className="mt-4 space-y-2">
                  {agent.competitions.map((ca) => {
                    const comp = ca.competition as any;
                    const won = comp.winnerId === id;
                    const isSport = comp.type === "sport";
                    const compStatus: string = comp.status ?? "open";
                    return (
                      <Link
                        key={comp.id}
                        href={`/competitions/${comp.id}`}
                        className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3 text-sm transition hover:bg-white/10"
                      >
                        <div
                          className="h-4 w-4 rounded-full flex-shrink-0"
                          style={{ background: won ? "#22c55e" : compStatus === "live" ? agent.color : "#ffffff20" }}
                        />
                        <span className="flex-1 truncate text-white">{comp.title}</span>
                        <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">
                          {compStatus === "settled"
                            ? isSport
                              ? `${(ca as any).score ?? 0} pts · ${won ? "Won" : "Lost"}`
                              : won ? "Won" : "Lost"
                            : compStatus}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </Surface>
            )}
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
