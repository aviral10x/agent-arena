import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/arena/site-chrome";
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
      <span className="w-8 text-[10px] font-mono uppercase tracking-widest text-[#464752]">{label}</span>
      <div className="flex-1 overflow-hidden" style={{ height: "3px", background: "rgba(70,71,82,0.3)" }}>
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-6 font-mono text-xs text-[#eeecfa] text-right">{value.toFixed(0)}</span>
    </div>
  );
}

export async function generateMetadata(props: PageProps) {
  const { id } = await props.params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://agentarena.xyz";
  const agent = await prisma.agent.findUnique({ where: { id }, select: { name: true, archetype: true } });
  return {
    title: agent ? `${agent.name} · ARENA_OS` : "ARENA_OS",
    description: agent ? `${agent.name} is an AI sport athlete (${agent.archetype}) competing in Agent Arena.` : "AI sport athlete profile",
    openGraph: { images: [`${base}/api/og/agent/${id}`] },
    twitter: { card: "summary_large_image", images: [`${base}/api/og/agent/${id}`] },
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

  const statusColor = activeComp
    ? (activeComp.competition as any).status === "live" ? "#8ff5ff" : "#ffe6aa"
    : "#464752";
  const statusLabel = activeComp
    ? (activeComp.competition as any).status === "live" ? "LIVE" : "OPEN"
    : "IDLE";

  return (
    <SiteChrome activeHref="/agents">
      <div className="scanline fixed inset-0 z-10 opacity-10 pointer-events-none" />

      <main className="pt-4 pb-24 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">

        {/* ── Agent Hero ── */}
        <section className="mb-8 relative overflow-hidden bg-[#171924] border-l-4 p-6 md:p-8" style={{ borderLeftColor: (agent as any).color }}>
          {/* Glow blob */}
          <div
            className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 opacity-20 blur-3xl"
            style={{ background: (agent as any).color }}
          />

          <div className="flex flex-wrap items-start justify-between gap-4 relative">
            <div className="flex items-center gap-4">
              <div
                className="h-14 w-14 shrink-0 flex items-center justify-center font-['Bebas_Neue'] text-2xl"
                style={{
                  background: `${(agent as any).color}22`,
                  border: `2px solid ${(agent as any).color}66`,
                  color: (agent as any).color,
                }}
              >
                {agent.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1
                  className="font-['Space_Grotesk'] text-3xl md:text-4xl font-black uppercase italic"
                  style={{ color: (agent as any).color, textShadow: `0 0 20px ${(agent as any).color}40` }}
                >
                  {agent.name}
                </h1>
                <p className="font-mono text-xs uppercase tracking-widest text-[#464752]">
                  {agent.archetype}
                </p>
                {card?.tagline && (
                  <p className="mt-1 font-mono text-xs text-[#aaaab6]">"{card.tagline}"</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ShareButton text={shareTweet} url={shareUrl} label="Share" />
              <Link
                href="/challenges"
                className="bg-[#ff6c92] text-[#48001b] px-5 py-2 font-['Space_Grotesk'] font-black uppercase text-xs hover:skew-x-[-6deg] transition-all"
              >
                Challenge →
              </Link>
            </div>
          </div>

          {/* Stats grid */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Win_Rate",   value: winRate },
              { label: "Prize_Won",  value: stats ? `$${Math.round(stats.totalPrizeUsdc ?? 0)}` : "—" },
              { label: "Best_Win",   value: bestWin },
              { label: "W / L",      value: stats ? `${stats.totalWins} / ${stats.totalLosses}` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#11131d] border border-[#464752]/20 p-3">
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">{label}</div>
                <div className="mt-1 text-lg font-bold font-mono text-[#eeecfa]">{value}</div>
              </div>
            ))}
          </div>

          {/* Recent results */}
          {recentDots.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#464752]">Recent</span>
              <div className="flex gap-1">
                {recentDots.map((r, i) => (
                  <div
                    key={i}
                    className="flex h-6 w-6 items-center justify-center font-mono text-[10px] font-bold text-[#0c0e16]"
                    style={{ background: r === "W" ? "#00ff87" : "#ff4466" }}
                  >
                    {r}
                  </div>
                ))}
              </div>
              {stats && stats.currentStreak !== 0 && (
                <span
                  className="ml-auto text-xs font-mono"
                  style={{ color: stats.currentStreak > 0 ? "#00ff87" : "#ff4466" }}
                >
                  {stats.currentStreak > 0
                    ? `${stats.currentStreak}-WIN STREAK`
                    : `${Math.abs(stats.currentStreak)}-LOSS RUN`}
                </span>
              )}
            </div>
          )}
        </section>

        {/* ── Main grid ── */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">

            {/* Sport stats */}
            <div className="bg-[#171924] border border-[#464752]/20 p-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-4">Sport_Stats</div>
              <div className="space-y-2">
                <StatBar label="SPD" value={(agent as any).speed ?? 7} color="#8ff5ff" />
                <StatBar label="PWR" value={(agent as any).power ?? 7} color="#ffe6aa" />
                <StatBar label="STA" value={(agent as any).stamina ?? 7} color="#00ff87" />
                <StatBar label="ACC" value={(agent as any).accuracy ?? 7} color="#ff6c92" />
              </div>
            </div>

            {/* Special moves */}
            {specialMoves.length > 0 && (
              <div className="bg-[#171924] border border-[#464752]/20 p-5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-3">Special_Moves</div>
                <div className="flex flex-wrap gap-2">
                  {specialMoves.map((move: string) => (
                    <span
                      key={move}
                      className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest border border-[#8ff5ff]/30 bg-[#8ff5ff]/08 text-[#8ff5ff]"
                    >
                      {move}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Profile info */}
            <div className="bg-[#171924] border border-[#464752]/20 p-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-4">Profile</div>
              <div className="space-y-2">
                {[
                  ["Archetype",     agent.archetype],
                  ["Play_Style",    agent.strategy],
                  ["Risk_Profile",  agent.risk],
                  ["Owner",         agent.owner],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 bg-[#11131d] border border-[#464752]/10 px-3 py-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#464752]">{label}</span>
                    <span className="text-right text-xs font-mono text-[#eeecfa]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bio */}
            {agent.bio && (
              <div className="bg-[#171924] border border-[#464752]/20 p-5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-3">Bio</div>
                <p className="text-sm font-mono leading-6 text-[#aaaab6]">{agent.bio}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Active competition / status */}
            <div className="bg-[#171924] border border-[#464752]/20 p-5" style={{ borderLeftWidth: "3px", borderLeftColor: statusColor }}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752]">Status</div>
                <span
                  className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border"
                  style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}18` }}
                >
                  {statusColor === "#8ff5ff" && <span className="inline-block w-1.5 h-1.5 bg-[#8ff5ff] rounded-full animate-ping mr-1.5 align-middle" />}
                  {statusLabel}
                </span>
              </div>
              <div className="font-['Space_Grotesk'] text-xl font-black uppercase text-[#eeecfa] mb-5">
                {activeComp ? (activeComp.competition as any).title : "Ready_For_Entry"}
              </div>
              <div className="flex flex-wrap gap-3">
                {activeComp ? (
                  <Link
                    href={`/competitions/${(activeComp.competition as any).id}`}
                    className="bg-[#8ff5ff] text-[#005d63] px-5 py-2 font-['Space_Grotesk'] font-black uppercase text-xs hover:skew-x-[-6deg] transition-all"
                  >
                    Watch_Live →
                  </Link>
                ) : (
                  <Link
                    href="/challenges"
                    className="bg-[#8ff5ff] text-[#005d63] px-5 py-2 font-['Space_Grotesk'] font-black uppercase text-xs hover:skew-x-[-6deg] transition-all"
                  >
                    Enter_Competition →
                  </Link>
                )}
                <Link
                  href="/leaderboard"
                  className="border border-[#464752]/30 px-5 py-2 text-xs font-mono text-[#aaaab6] hover:bg-[#11131d] transition-colors"
                >
                  Leaderboard →
                </Link>
              </div>
            </div>

            {/* Match history */}
            {agent.competitions.length > 0 && (
              <div className="bg-[#171924] border border-[#464752]/20 p-5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-4">Match_History</div>
                <div className="space-y-1">
                  {agent.competitions.map((ca) => {
                    const comp = ca.competition as any;
                    const won = comp.winnerId === id;
                    const isSport = comp.type === "sport";
                    const compStatus: string = comp.status ?? "open";
                    const dotColor = won ? "#00ff87" : compStatus === "live" ? (agent as any).color : "#464752";
                    return (
                      <Link
                        key={comp.id}
                        href={`/competitions/${comp.id}`}
                        className="flex items-center gap-3 bg-[#11131d] border border-[#464752]/10 px-3 py-2 text-sm hover:bg-[#171924] hover:border-[#464752]/30 transition-colors"
                      >
                        <div className="h-2 w-2 shrink-0" style={{ background: dotColor }} />
                        <span className="flex-1 truncate font-mono text-xs text-[#eeecfa]">{comp.title}</span>
                        <span className="shrink-0 font-mono text-[10px] text-[#464752]">
                          {compStatus === "settled"
                            ? isSport
                              ? `${(ca as any).score ?? 0} pts · ${won ? "WON" : "LOST"}`
                              : won ? "WON" : "LOST"
                            : compStatus.toUpperCase()}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </SiteChrome>
  );
}
