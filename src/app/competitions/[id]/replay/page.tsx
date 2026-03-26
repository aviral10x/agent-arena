import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/arena/site-chrome";
import { StatusPill, ButtonLink } from "@/components/arena/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }> };

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-[10px] uppercase tracking-widest text-white/40">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(value / 10) * 100}%`, background: color }} />
      </div>
      <span className="text-[10px] tabular-nums text-white/40">{value}</span>
    </div>
  );
}

export default async function ReplayPage({ params }: PageProps) {
  const { id } = await params;

  const compRecord = await prisma.competition.findUnique({
    where: { id },
    include: {
      agents: { include: { agent: true }, orderBy: { score: "desc" } },
    },
  });

  if (!compRecord) notFound();

  const dbTrades = await prisma.trade.findMany({
    where: { competitionId: id },
    include: { agent: true },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  const isSport = (compRecord as any).type === "sport";
  const sport = (compRecord as any).sport ?? "badminton";
  const sportEmoji = sport === "tennis" ? "🎾" : sport === "table-tennis" ? "🏓" : "🏸";

  // Parse game state for set scores
  let gameState: any = null;
  try { gameState = (compRecord as any).gameState ? JSON.parse((compRecord as any).gameState) : null; } catch {}

  const winner = compRecord.agents.find(ca => ca.agentId === compRecord.winnerId);
  const agents = compRecord.agents;

  // Shot type distribution
  const shotCounts: Record<string, number> = {};
  for (const t of dbTrades) shotCounts[t.type] = (shotCounts[t.type] ?? 0) + 1;
  const topShot = Object.entries(shotCounts).sort((a, b) => b[1] - a[1])[0];

  // Rally highlights (most interesting events - contains WINNER or UNRETURNABLE)
  const highlights = dbTrades
    .filter(t => t.pair?.includes("WINNER") || t.pair?.includes("UNRETURNABLE") || t.pair?.includes("POINT"))
    .slice(0, 5);

  const ACTION_EMOJI: Record<string, string> = {
    SMASH: "💥", DROP: "🎯", CLEAR: "↩️", DRIVE: "⚡", LOB: "🌙", BLOCK: "🛡️", SERVE: "🏸", SPECIAL: "✨",
  };

  return (
    <SiteChrome activeHref="/competitions">
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

        {/* Header */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <StatusPill status="settled" />
            <span className="text-xs font-mono text-white/30">Match Replay · {sportEmoji} {sport}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">{compRecord.title}</h1>
          <p className="text-sm text-white/50">{compRecord.premise}</p>

          {winner && (
            <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2">
              <span className="text-xs uppercase tracking-widest text-yellow-400">🏆 Winner</span>
              <span className="font-bold text-white">{winner.agent.name}</span>
              <span className="font-mono text-sm text-yellow-400">{winner.score} pts</span>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <ButtonLink href={`/competitions/${compRecord.id}`}>Back to match</ButtonLink>
            <Link href="/challenges" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 transition">
              Issue challenge
            </Link>
          </div>
        </div>

        {/* Match stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Rallies", gameState?.rallyCount ?? dbTrades.length],
            ["Top Shot", topShot ? `${ACTION_EMOJI[topShot[0]] ?? "•"} ${topShot[0]}` : "—"],
            ["Sets", gameState?.sets?.length ?? 1],
            ["Duration", compRecord.duration ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">{label}</div>
              <div className="text-lg font-bold text-white">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Rally highlights */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-4">Rally Highlights</div>
            {highlights.length === 0 ? (
              <p className="text-sm text-white/30">No rally data recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {highlights.map((h, i) => {
                  const agentColor = agents.find(ca => ca.agentId === h.agentId)?.agent.color ?? "#888";
                  return (
                    <div key={h.id} className="flex gap-3 items-start rounded-xl border border-white/8 bg-white/3 p-3">
                      <span className="text-lg">{ACTION_EMOJI[h.type] ?? "•"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold" style={{ color: agentColor }}>
                            {h.agent?.name ?? h.agentId}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest text-white/30">{h.type}</span>
                          <span className="text-[10px] text-yellow-400 font-bold">POINT ⚡</span>
                        </div>
                        <p className="text-xs text-white/50 truncate">{h.pair}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Final standings */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-4">Final Standings</div>
            <div className="space-y-4">
              {agents.map((ca, i) => {
                const a = ca.agent as any;
                const specialMoves: string[] = (() => {
                  try { const v = a.specialMoves; return Array.isArray(v) ? v : JSON.parse(v ?? "[]"); } catch { return []; }
                })();
                return (
                  <div key={ca.agentId} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{i === 0 ? "🥇" : "🥈"}</span>
                        <div className="w-3 h-3 rounded-full" style={{ background: a.color }} />
                        <span className="font-bold text-white">{a.name}</span>
                        <span className="text-[10px] text-white/30 uppercase tracking-wide">{a.archetype}</span>
                      </div>
                      <span className="font-mono text-lg font-black" style={{ color: a.color }}>{ca.score} pts</span>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      <StatBar label="SPD" value={a.speed ?? 7} color="#00d4aa" />
                      <StatBar label="PWR" value={a.power ?? 7} color="#f87171" />
                      <StatBar label="STA" value={a.stamina ?? 7} color="#34d399" />
                      <StatBar label="ACC" value={a.accuracy ?? 7} color="#c084fc" />
                    </div>
                    {specialMoves.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {specialMoves.map(m => (
                          <span key={m} className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: "rgba(0,212,170,0.12)", color: "#00d4aa", border: "1px solid rgba(0,212,170,0.2)" }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Shot breakdown */}
        {Object.keys(shotCounts).length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-4">Shot Breakdown</div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(shotCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <span>{ACTION_EMOJI[type] ?? "•"}</span>
                    <span className="text-sm font-bold text-white">{type}</span>
                    <span className="font-mono text-sm text-white/40">{count}×</span>
                  </div>
                ))}
            </div>
          </div>
        )}

      </section>
    </SiteChrome>
  );
}
