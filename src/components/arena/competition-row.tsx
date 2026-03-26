"use client";

import Link from "next/link";
import { LiveCountdown } from "@/components/arena/competition-filters";

interface Agent {
  id: string; name: string; color: string; archetype: string;
  pnl?: number; pnlPct?: number; portfolio?: number; trades?: number; score?: number;
}

interface RowCompetition {
  id: string; title: string; status: string; mode: string;
  countdown: string; startedAt?: string | null; durationSeconds?: number;
  entryFee: string; prizePool: string; agents: Agent[];
  winnerId?: string | null; volumeUsd?: number;
  bettingOpen?: boolean; totalBetUsdc?: number;
  createdAt?: string | null;
  type?: string; sport?: string;
}

function pnlVal(a: Agent | undefined) {
  if (!a) return 0;
  return (a as any).pnlPct ?? a.pnl ?? 0;
}

function sportEmoji(sport: string | undefined) {
  if (sport === "tennis") return "🎾";
  if (sport === "table-tennis") return "🏓";
  return "🏸";
}

function ScoreBadge({ agent, isSport, size = "sm" }: { agent: Agent; isSport: boolean; size?: "xs" | "sm" }) {
  const cls = size === "xs" ? "text-[10px] sm:text-[11px]" : "text-xs sm:text-sm";
  if (isSport) {
    return (
      <span className={`font-mono font-bold tabular-nums text-[var(--teal)] ${cls}`}>
        {(agent as any).score ?? 0} pts
      </span>
    );
  }
  const value = pnlVal(agent);
  const up   = value > 0;
  const zero = value === 0;
  return (
    <span className={`font-mono font-bold tabular-nums ${cls}`}
      style={{ color: zero ? "var(--text-muted)" : up ? "var(--green)" : "var(--red)" }}>
      {up ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

function PnlBadge({ value, size = "sm" }: { value: number; size?: "xs" | "sm" }) {
  const up   = value > 0;
  const zero = value === 0;
  const cls  = size === "xs" ? "text-[10px] sm:text-[11px]" : "text-xs sm:text-sm";
  return (
    <span className={`font-mono font-bold tabular-nums ${cls}`}
      style={{ color: zero ? "var(--text-muted)" : up ? "var(--green)" : "var(--red)" }}>
      {up ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

function RowTimer({ c, isLive, isOpen, isSettled }: {
  c: RowCompetition; isLive: boolean; isOpen: boolean; isSettled: boolean;
}) {
  if (isSettled) return <span className="text-[10px] text-[var(--text-muted)] sm:text-xs">Done</span>;
  if (isOpen)    return <span className="text-[10px] font-semibold text-[var(--gold)] sm:text-xs">Open</span>;
  return (
    <LiveCountdown
      targetText={c.countdown} status="live"
      startedAt={c.startedAt} durationSeconds={c.durationSeconds}
      compact
    />
  );
}

function formatVol(usd: number) {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
  return `$${usd.toFixed(0)}`;
}

export function CompetitionRow({ competition: c }: { competition: RowCompetition }) {
  const [a, b] = c.agents;
  const isLive    = c.status === "live";
  const isOpen    = c.status === "open";
  const isSettled = c.status === "settled";
  const isSport   = (c as any).type === "sport";
  const sport     = (c as any).sport as string | undefined;

  const winner  = c.agents.find(ag => ag.id === c.winnerId);
  const loser   = c.agents.find(ag => ag.id !== c.winnerId);

  // For sport use score; for trading use pnl
  const scoreA = isSport ? ((a as any)?.score ?? 0) : pnlVal(a);
  const scoreB = isSport ? ((b as any)?.score ?? 0) : pnlVal(b);

  const gap         = a && b ? Math.abs(scoreA - scoreB) : 0;
  const leadAgent   = a && b ? (scoreA >= scoreB ? a : b) : a;
  const trailAgent  = a && b ? (scoreA >= scoreB ? b : a) : b;
  const maxAbs      = isSport
    ? Math.max(scoreA, scoreB, 1)
    : Math.max(Math.abs(scoreA), Math.abs(scoreB), 0.01);
  const leaderPct   = isSport
    ? Math.min(100, (scoreA >= scoreB ? scoreA : scoreB) / maxAbs * 80 + 20)
    : Math.min(100, 50 + (gap / maxAbs) * 40);
  const trailerPct  = Math.max(10, 100 - leaderPct);

  const totalTrades = (a?.trades ?? 0) + (b?.trades ?? 0);
  const vol         = c.volumeUsd && c.volumeUsd > 0 ? formatVol(c.volumeUsd) : null;
  const betPool     = c.totalBetUsdc && c.totalBetUsdc > 0 ? `$${c.totalBetUsdc.toFixed(2)}` : null;

  // Score ratio for the bottom bar (sport only)
  const totalScore = scoreA + scoreB;
  const aRatioPct  = totalScore > 0 ? Math.round((scoreA / totalScore) * 100) : 50;
  const bRatioPct  = 100 - aRatioPct;

  return (
    <Link
      href={`/competitions/${c.id}`}
      className={`group block rounded-2xl border bg-[var(--bg-card)] px-3 py-3 transition row-hover hover:border-white/[0.12] sm:px-4 relative overflow-hidden ${
        isLive && isSport ? "border-l-2 border-teal-400 border-white/[0.06]" : "border-white/[0.06]"
      }`}
    >
      {/* ── MAIN ROW ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Status dot / sport emoji */}
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
          {isSport ? (
            <span className="text-base leading-none">{sportEmoji(sport)}</span>
          ) : isLive ? (
            <div className="live-dot" />
          ) : isOpen ? (
            <div className="h-2 w-2 rounded-full bg-[var(--gold)]" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-white/20" />
          )}
        </div>
        {/* Pulsing teal dot for live sport rows */}
        {isLive && isSport && (
          <div
            className="h-2 w-2 rounded-full bg-teal-400 shrink-0 animate-pulse"
            style={{ boxShadow: '0 0 6px rgba(45,212,191,0.7)' }}
          />
        )}

        {/* ── Agent A ── */}
        <div className="flex w-[110px] flex-shrink-0 items-center gap-1.5 sm:w-[160px] lg:w-[190px]">
          {a ? (
            <>
              <div className="h-5 w-5 shrink-0 rounded-full"
                style={{ background: a.color, boxShadow: isLive ? `0 0 8px ${a.color}80` : "none" }} />
              <div className="min-w-0">
                <div className="truncate text-[11px] font-bold text-white sm:text-[13px]">
                  {a.name}{isSettled && winner?.id === a.id && <span className="ml-0.5 text-[var(--gold)]">🏆</span>}
                </div>
                {isLive || isSettled
                  ? <ScoreBadge agent={a} isSport={isSport} size="xs" />
                  : <div className="truncate text-[9px] text-[var(--text-muted)]">{a.archetype}</div>}
              </div>
            </>
          ) : <span className="text-[10px] text-[var(--text-muted)]">—</span>}
        </div>

        {/* ── Centre ── */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
          {isLive && a && b ? (
            <>
              <div className="w-full flex h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${leaderPct}%`, background: leadAgent?.color }} />
                <div className="ml-auto h-full rounded-full opacity-50 transition-all duration-1000"
                  style={{ width: `${trailerPct}%`, background: trailAgent?.color }} />
              </div>
              <div className="text-[9px] font-mono text-[var(--text-muted)] tabular-nums">
                {isSport
                  ? (gap > 0 ? `${scoreA} – ${scoreB}` : "tied")
                  : (gap > 0 ? `gap ${gap.toFixed(1)}%` : "tied")}
              </div>
            </>
          ) : isSettled ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                {isSport
                  ? (a && b ? `${scoreA} – ${scoreB}` : "—")
                  : (gap > 0 ? `${gap.toFixed(1)}% gap` : "tied")}
              </span>
              {a && b && gap > 0 && (
                <div className="w-12 flex h-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full"
                    style={{ width: `${leaderPct}%`, background: winner?.color }} />
                  <div className="ml-auto h-full rounded-full opacity-40"
                    style={{ width: `${trailerPct}%`, background: loser?.color }} />
                </div>
              )}
            </div>
          ) : isOpen ? (
            <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--gold)]">
              Open seat
            </div>
          ) : (
            <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]">VS</div>
          )}
        </div>

        {/* ── Agent B ── */}
        <div className="flex w-[110px] flex-shrink-0 items-center justify-end gap-1.5 sm:w-[160px] lg:w-[190px]">
          {b ? (
            <>
              <div className="min-w-0 text-right">
                <div className="truncate text-[11px] font-bold text-white sm:text-[13px]">
                  {isSettled && winner?.id === b.id && <span className="mr-0.5 text-[var(--gold)]">🏆</span>}{b.name}
                </div>
                {isLive || isSettled
                  ? <ScoreBadge agent={b} isSport={isSport} size="xs" />
                  : <div className="truncate text-[9px] text-[var(--text-muted)]">{b.archetype}</div>}
              </div>
              <div className="h-5 w-5 shrink-0 rounded-full"
                style={{ background: b.color, boxShadow: isLive ? `0 0 8px ${b.color}80` : "none" }} />
            </>
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">Waiting…</span>
          )}
        </div>

        {/* Timer */}
        <div className="hidden w-[4.5rem] flex-shrink-0 text-right sm:block lg:w-20">
          <RowTimer c={c} isLive={isLive} isOpen={isOpen} isSettled={isSettled} />
        </div>

        {/* Action pill */}
        <div className="flex w-14 flex-shrink-0 justify-end sm:w-16">
          {isLive ? (
            <span className="rounded-full border border-[var(--teal)]/25 bg-[var(--teal)]/12 px-2 py-1 text-[9px] font-bold text-[var(--teal)] transition group-hover:bg-[var(--teal)]/20 sm:px-2.5 sm:text-[10px]">
              Watch
            </span>
          ) : isOpen ? (
            <span className="rounded-full border border-[var(--gold)]/25 bg-[var(--gold)]/10 px-2 py-1 text-[9px] font-bold text-[var(--gold)] transition group-hover:bg-[var(--gold)]/20 sm:px-2.5 sm:text-[10px]">
              Enter
            </span>
          ) : (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-semibold text-[var(--text-muted)] transition group-hover:bg-white/10 sm:px-2.5 sm:text-[10px]">
              Replay
            </span>
          )}
        </div>
      </div>

      {/* ── Mobile timer ── */}
      <div className="mt-1.5 flex items-center justify-end gap-1 sm:hidden">
        <RowTimer c={c} isLive={isLive} isOpen={isOpen} isSettled={isSettled} />
      </div>

      {/* ── SETTLED DETAIL STRIP ─────────────────────────────────────── */}
      {isSettled && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/[0.05] pt-2">

          {winner && (
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--gold)] text-[11px]">🏆</span>
              <span className="text-xs font-bold text-white">{winner.name}</span>
              {isSport ? (
                <span className="font-mono text-xs font-bold text-[var(--teal)]">
                  {(winner as any).score ?? 0} pts
                </span>
              ) : (
                <span className="font-mono text-xs font-bold text-[var(--green)]">
                  +{Math.abs(pnlVal(winner)).toFixed(1)}%
                </span>
              )}
            </div>
          )}

          <span className="text-white/15">vs</span>

          {loser && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[var(--text-muted)]">{loser.name}</span>
              {isSport ? (
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  {(loser as any).score ?? 0} pts
                </span>
              ) : (
                <PnlBadge value={pnlVal(loser)} size="xs" />
              )}
            </div>
          )}

          <span className="text-white/15 mx-0.5">·</span>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {isSport ? (
              <>
                {totalTrades > 0 && (
                  <span className="text-[10px] text-[var(--text-muted)]">{totalTrades} rallies</span>
                )}
                <span className="text-[10px] font-semibold text-[var(--teal)]">
                  {sportEmoji((c as any).sport)} {(c as any).sport ?? "badminton"}
                </span>
              </>
            ) : (
              <>
                {totalTrades > 0 && (
                  <span className="text-[10px] text-[var(--text-muted)]">{totalTrades} trades</span>
                )}
                {vol && (
                  <span className="text-[10px] font-mono font-semibold text-[var(--teal)]">{vol} vol</span>
                )}
              </>
            )}
            {betPool && (
              <span className="text-[10px] text-[var(--text-muted)]">
                💰 <span className="text-[var(--gold)]">{betPool}</span> bet
              </span>
            )}
            <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-[var(--text-muted)]">
              {c.mode}
            </span>
          </div>
        </div>
      )}

      {/* ── Score ratio bar (sport only, live or settled) ── */}
      {isSport && a && b && (isLive || isSettled) && totalScore > 0 && (
        <div className="mt-2 flex h-1 overflow-hidden rounded-full">
          <div
            className="h-full transition-all duration-700"
            style={{ width: `${aRatioPct}%`, background: a.color, opacity: 0.8 }}
          />
          <div
            className="h-full transition-all duration-700"
            style={{ width: `${bRatioPct}%`, background: b.color, opacity: 0.8 }}
          />
        </div>
      )}
    </Link>
  );
}
