import Link from "next/link";
import { notFound } from "next/navigation";
import { ReplayArena } from "@/components/arena/replay-arena";
import { SiteChrome } from "@/components/arena/site-chrome";
import { TradeTimeline } from "@/components/arena/trade-timeline";
import { Surface, StatusPill, ButtonLink } from "@/components/arena/ui";
import { buildArenaReplayState } from "@/lib/arena-replay";
import { prisma } from "@/lib/db";
import type { Competition, TradeEvent } from "@/lib/arena-data";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

// ── Sport stat bar ─────────────────────────────────────────────────────
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</span>
        <span className="font-mono text-[10px] text-white">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Sport emoji from sport field ──────────────────────────────────────
function sportEmoji(sport: string | undefined) {
  if (!sport) return "🏸";
  if (sport === "tennis") return "🎾";
  if (sport === "table-tennis") return "🏓";
  return "🏸";
}

export default async function ReplayPage({ params }: PageProps) {
  const { id } = await params;

  const [compRecord, dbTrades] = await Promise.all([
    prisma.competition.findUnique({
      where: { id },
      include: {
        agents: { include: { agent: true }, orderBy: { score: "desc" } },
      },
    }),
    prisma.trade.findMany({
      where: { competitionId: id },
      include: { agent: true },
      orderBy: { timestamp: "asc" },
    }),
  ]);

  if (!compRecord) notFound();

  const isSport = (compRecord as any).type === "sport";

  // ── Build common competition object ───────────────────────────────
  const competition: Competition = {
    ...compRecord,
    mode:   compRecord.mode as any,
    status: compRecord.status as any,
    volume: `$${((compRecord as any).volumeUsd / 1000).toFixed(1)}k`,
    agents: compRecord.agents.map((ca: any) => ({
      ...ca.agent,
      traits:      (() => { try { return JSON.parse(ca.agent.traits); } catch { return []; } })(),
      specialMoves: (() => { try { return JSON.parse(ca.agent.specialMoves ?? "[]"); } catch { return []; } })(),
      risk:        ca.agent.risk,
      pnl:         ca.pnl,
      pnlPct:      ca.pnlPct,
      trades:      ca.trades,
      portfolio:   ca.portfolio,
      score:       ca.score,
    })),
  };

  const winner = compRecord.winnerId
    ? competition.agents.find(a => a.id === compRecord.winnerId)
    : competition.agents[0];

  // ── SPORT REPLAY ──────────────────────────────────────────────────
  if (isSport) {
    // Parse gameState for set scores
    let gameState: any = null;
    try { gameState = JSON.parse((compRecord as any).gameState ?? "null"); } catch {}

    const sets: Array<{ agentScores: Record<string, number> }> = gameState?.sets ?? [];
    const rallyCount: number = gameState?.rallyCount ?? dbTrades.length;
    const sport = (compRecord as any).sport ?? "badminton";

    // 5 most dramatic rallies — highest pointValue or just first 5
    const highlights = [...dbTrades]
      .sort((a: any, b: any) => (b.pointValue ?? 0) - (a.pointValue ?? 0))
      .slice(0, 5);

    // Most-used shot type
    const typeCounts: Record<string, number> = {};
    for (const t of dbTrades) {
      typeCounts[t.type] = (typeCounts[t.type] ?? 0) + 1;
    }
    const mostUsedShot = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

    // Agent name lookup for set scores
    const agentMap = Object.fromEntries(
      compRecord.agents.map((ca: any) => [ca.agent.id, ca.agent.name])
    );

    return (
      <SiteChrome activeHref="/competitions">
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="space-y-6">

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="glass-panel-strong rounded-[1.4rem] p-5 sm:rounded-[1.9rem] sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status="settled" />
                <span className="font-mono text-sm text-[var(--text-muted)]">
                  {sportEmoji(sport)} Match Replay · #{competition.id.slice(0, 8)}
                </span>
              </div>
              <h1 className="mt-5 text-[clamp(1.35rem,3.5vw,2.25rem)] font-semibold tracking-[-0.05em] text-white">
                {competition.title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
                {competition.premise}
              </p>

              {/* Winner banner */}
              {winner && (
                <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold-soft)] px-5 py-3">
                  <span className="text-xs uppercase tracking-[0.22em] text-[var(--gold)]">🏆 Winner</span>
                  <span className="font-semibold text-white">{winner.name}</span>
                  <span className="font-mono text-sm text-[var(--green)]">
                    {(winner as any).score ?? 0} pts
                  </span>
                </div>
              )}

              <div className="mt-5 sm:mt-7 flex flex-wrap gap-3">
                <ButtonLink href={`/competitions/${competition.id}`}>Back to arena</ButtonLink>
                <Link
                  href="/agents/create"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--text-primary)] transition hover:bg-white/5"
                >
                  Build challenger
                </Link>
              </div>
            </div>

            {/* ── Match Summary ───────────────────────────────────── */}
            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Match Summary</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {/* Set-by-set scores */}
                <div className="col-span-2">
                  {sets.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] mb-2">Set Scores</div>
                      {sets.map((set, i) => {
                        const entries = Object.entries(set.agentScores ?? {});
                        return (
                          <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                            <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] w-12">Set {i + 1}</span>
                            <div className="flex items-center gap-3 flex-1">
                              {entries.map(([agentId, score], j) => (
                                <span key={agentId} className="flex items-center gap-1.5">
                                  <span className="text-xs text-[var(--text-secondary)]">{agentMap[agentId] ?? agentId}</span>
                                  <span className="font-mono font-bold text-white">{score}</span>
                                  {j < entries.length - 1 && <span className="text-white/20">—</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--text-muted)]">
                      Set data not available
                    </div>
                  )}
                </div>
                {/* Total rallies */}
                <div className="rounded-[1.15rem] border border-white/10 bg-white/5 p-4 flex flex-col justify-center items-center text-center">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Total Rallies</div>
                  <div className="mt-2 text-3xl font-black text-white tabular-nums">{rallyCount}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">rally events</div>
                </div>
              </div>
            </Surface>

            <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              {/* ── Rally Highlights ──────────────────────────────── */}
              <Surface>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                  Rally Highlights
                </div>
                <div className="mt-4 space-y-3">
                  {highlights.length === 0 && (
                    <p className="text-sm text-[var(--text-muted)]">No rally data recorded.</p>
                  )}
                  {highlights.map((t: any, i: number) => (
                    <div key={t.id} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[var(--gold)]">#{i + 1}</span>
                          <span
                            className="rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em]"
                            style={{
                              borderColor: t.type === "BUY" ? "var(--green)" : t.type === "SELL" ? "var(--red)" : "var(--gold)",
                              color: t.type === "BUY" ? "var(--green)" : t.type === "SELL" ? "var(--red)" : "var(--gold)",
                            }}
                          >
                            {t.type}
                          </span>
                          <span className="text-sm font-semibold text-white">{t.agent?.name ?? "—"}</span>
                        </div>
                        {t.pointValue > 0 && (
                          <span className="font-mono text-xs text-[var(--teal)]">+{t.pointValue}pt</span>
                        )}
                      </div>
                      {t.rationale && (
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{t.rationale}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Surface>

              <div className="space-y-5">
                {/* ── Final Standings ─────────────────────────────── */}
                <Surface>
                  <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Final Standings</div>
                  <div className="mt-4 grid gap-3">
                    {competition.agents.map((agent: any, i: number) => (
                      <div key={agent.id} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {agent.name}
                            </div>
                            <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                              {agent.archetype}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg font-bold text-white">{agent.score ?? 0}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">points</div>
                          </div>
                        </div>
                        {/* Stat bars */}
                        <div className="grid gap-1.5">
                          <StatBar label="SPD" value={agent.speed ?? 7} color="#66E3FF" />
                          <StatBar label="PWR" value={agent.power ?? 7} color="#f59e0b" />
                          <StatBar label="STA" value={agent.stamina ?? 7} color="#22c55e" />
                          <StatBar label="ACC" value={agent.accuracy ?? 7} color="#a78bfa" />
                        </div>
                        {/* Special moves */}
                        {agent.specialMoves && agent.specialMoves.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {agent.specialMoves.map((move: string) => (
                              <span key={move} className="rounded-full border border-[var(--teal)]/30 bg-[var(--teal)]/8 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--teal)]">
                                {move}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Surface>

                {/* ── Match Stats ─────────────────────────────────── */}
                <Surface>
                  <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Match Stats</div>
                  <div className="mt-4 grid gap-2">
                    {[
                      ["Rallies played", String(rallyCount)],
                      ["Longest rally", `~${Math.max(1, Math.round(rallyCount * 0.12))} exchanges`],
                      ["Most used shot", mostUsedShot ? `${mostUsedShot[0]} (${mostUsedShot[1]}×)` : "—"],
                      ["Sport", `${sportEmoji(sport)} ${sport.charAt(0).toUpperCase() + sport.slice(1)}`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                        <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
                        <span className="text-sm font-semibold text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </Surface>
              </div>
            </div>
          </div>
        </section>
      </SiteChrome>
    );
  }

  // ── TRADING REPLAY (original) ─────────────────────────────────────
  const tradeFeed: TradeEvent[] = dbTrades.map((t: any) => ({
    id:          t.id,
    type:        t.type,
    agentId:     t.agentId,
    agentName:   t.agent?.name ?? t.agentId,
    pair:        t.pair,
    amount:      t.amount,
    rationale:   t.rationale,
    priceImpact: t.priceImpact,
    timestamp:   t.timestamp,
    time:        t.time ?? "",
  }));

  const replay = buildArenaReplayState(competition, tradeFeed);

  const highlights = dbTrades
    .filter((_: any, i: number) => i % Math.max(1, Math.floor(dbTrades.length / 3)) === 0)
    .slice(0, 3)
    .map((t: any) => ({
      title: `${t.type} · ${t.pair}`,
      detail: t.rationale,
    }));

  const finalStandings = [...competition.agents].sort(
    (a, b) => b.portfolio - a.portfolio
  );

  return (
    <SiteChrome activeHref="/competitions">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="space-y-6">

          {/* Header */}
          <div className="glass-panel-strong rounded-[1.4rem] p-5 sm:rounded-[1.9rem] sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status="settled" />
              <span className="font-mono text-sm text-[var(--text-muted)]">
                Replay · bout #{competition.id}
              </span>
            </div>
            <h1 className="mt-5 text-[clamp(1.35rem,3.5vw,2.25rem)] font-semibold tracking-[-0.05em] text-white">
              {competition.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              {competition.premise}
            </p>

            {winner && (
              <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold-soft)] px-5 py-3">
                <span className="text-xs uppercase tracking-[0.22em] text-[var(--gold)]">Winner</span>
                <span className="font-semibold text-white">{winner.name}</span>
                <span className="font-mono text-sm text-[var(--green)]">
                  ${finalStandings[0]?.portfolio.toFixed(2)}
                </span>
              </div>
            )}

            <div className="mt-5 sm:mt-7 flex flex-wrap gap-3">
              <ButtonLink href={`/competitions/${competition.id}`}>Back to arena</ButtonLink>
              <Link
                href="/agents/create"
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--text-primary)] transition hover:bg-white/5"
              >
                Build challenger
              </Link>
            </div>
          </div>

          <ReplayArena
            key={`${replay.meta.competitionId}-${replay.meta.blockNumberSeed}`}
            replay={replay}
          />

          <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <TradeTimeline trades={tradeFeed} title="Settled trade chronology" />

            <div className="space-y-6">
              {highlights.length > 0 && (
                <Surface>
                  <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    Key moments
                  </div>
                  <div className="mt-4 space-y-4">
                    {highlights.map((moment: any, i: number) => (
                      <div key={i} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-sm sm:text-base font-semibold text-white">{moment.title}</div>
                          <div className="font-mono text-sm text-[var(--gold)]">0{i + 1}</div>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{moment.detail}</p>
                      </div>
                    ))}
                  </div>
                </Surface>
              )}

              <Surface>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                  Final standings
                </div>
                <div className="mt-4 grid gap-3">
                  {finalStandings.map((agent, i) => (
                    <div key={agent.id} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {agent.name}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            {agent.trades} trades · {agent.archetype}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg text-white">
                            ${agent.portfolio.toFixed(2)}
                          </div>
                          <div
                            className="font-mono text-sm"
                            style={{ color: ((agent as any).pnlPct ?? agent.pnl) >= 0 ? "var(--green)" : "var(--red)" }}
                          >
                            {((agent as any).pnlPct ?? agent.pnl) >= 0 ? "+" : ""}
                            {((agent as any).pnlPct ?? agent.pnl).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
