"use client";

import Link from "next/link";
import { LiveCountdown } from "@/components/arena/competition-filters";

interface Agent {
  id: string; name: string; color: string; archetype: string;
  pnl?: number; pnlPct?: number; portfolio?: number; trades?: number;
}

interface RowCompetition {
  id: string; title: string; status: string; mode: string;
  countdown: string; startedAt?: string | null; durationSeconds?: number;
  entryFee: string; prizePool: string; agents: Agent[];
  winnerId?: string | null; volumeUsd?: number;
  bettingOpen?: boolean; totalBetUsdc?: number;
  createdAt?: string | null;
}

function pnlVal(a: Agent) { return (a as any).pnlPct ?? a.pnl ?? 0; }

function PnlBadge({ value }: { value: number }) {
  const up   = value > 0;
  const zero = value === 0;
  return (
    <span
      className="font-mono text-xs font-bold tabular-nums sm:text-sm"
      style={{ color: zero ? "var(--text-muted)" : up ? "var(--green)" : "var(--red)" }}
    >
      {up ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

/** Compact timer text — always single-line, never causes overflow */
function RowTimer({
  c,
  isLive,
  isOpen,
  isSettled,
}: {
  c: RowCompetition;
  isLive: boolean;
  isOpen: boolean;
  isSettled: boolean;
}) {
  if (isSettled) {
    return <span className="text-[10px] font-medium text-[var(--text-muted)] sm:text-xs">Done</span>;
  }
  if (isOpen) {
    return <span className="text-[10px] font-semibold text-[var(--gold)] sm:text-xs">Open</span>;
  }
  // live — inline compact countdown (no "remaining" label, truncated status)
  return (
    <LiveCountdown
      targetText={c.countdown}
      status="live"
      startedAt={c.startedAt}
      durationSeconds={c.durationSeconds}
      compact
    />
  );
}

function SettledDetails({ c }: { c: RowCompetition }) {
  const [a, b] = c.agents;
  const winner = c.agents.find(ag => ag.id === c.winnerId);
  const loser  = c.agents.find(ag => ag.id !== c.winnerId && ag.id);
  const totalTrades = (a?.trades ?? 0) + (b?.trades ?? 0);
  const vol = c.volumeUsd && c.volumeUsd > 0
    ? (c.volumeUsd >= 1000 ? `$${(c.volumeUsd / 1000).toFixed(1)}k` : `$${c.volumeUsd.toFixed(0)}`)
    : null;
  const betPool = c.totalBetUsdc && c.totalBetUsdc > 0
    ? `$${c.totalBetUsdc.toFixed(2)}`
    : null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.05] pt-2">
      {/* Title */}
      <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[160px] sm:max-w-xs">
        {c.title}
      </span>

      <span className="text-white/20 hidden sm:inline">·</span>

      {/* Winner highlight */}
      {winner && (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--gold)]">
          🏆 {winner.name}
          <span className="font-mono text-[var(--green)]">
            {pnlVal(winner) >= 0 ? '+' : ''}{pnlVal(winner).toFixed(1)}%
          </span>
        </span>
      )}

      {/* Loser */}
      {loser && (
        <span className="hidden items-center gap-1 text-[10px] text-[var(--text-muted)] sm:flex">
          vs {loser.name}
          <span className="font-mono" style={{ color: pnlVal(loser) >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {pnlVal(loser) >= 0 ? '+' : ''}{pnlVal(loser).toFixed(1)}%
          </span>
        </span>
      )}

      <span className="text-white/20 hidden sm:inline">·</span>

      {/* Stats pills */}
      <div className="flex items-center gap-2">
        {totalTrades > 0 && (
          <span className="text-[9px] text-[var(--text-muted)]">
            {totalTrades} trades
          </span>
        )}
        {vol && (
          <span className="text-[9px] font-mono text-[var(--teal)]">{vol} vol</span>
        )}
        {betPool && (
          <span className="flex items-center gap-0.5 text-[9px] text-[var(--text-muted)]">
            <span className="text-[var(--gold)]">💰</span>{betPool} bet
          </span>
        )}
        {c.mode && (
          <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-[var(--text-muted)]">
            {c.mode}
          </span>
        )}
      </div>
    </div>
  );
}

export function CompetitionRow({ competition: c }: { competition: RowCompetition }) {
  const [a, b] = c.agents;
  const isLive    = c.status === "live";
  const isOpen    = c.status === "open";
  const isSettled = c.status === "settled";

  const gap      = a && b ? Math.abs(pnlVal(a) - pnlVal(b)) : 0;
  const leader   = a && b ? (pnlVal(a) >= pnlVal(b) ? a : b) : a;
  const trailer  = a && b ? (pnlVal(a) >= pnlVal(b) ? b : a) : b;
  const maxAbs   = Math.max(Math.abs(pnlVal(a ?? {})), Math.abs(pnlVal(b ?? {})), 0.01);
  const leaderPct  = Math.min(100, 50 + (gap / maxAbs) * 40);
  const trailerPct = Math.max(10, 100 - leaderPct);

  return (
    <Link
      href={`/competitions/${c.id}`}
      className="group block rounded-2xl border border-white/[0.06] bg-[var(--bg-card)] px-3 py-3 transition row-hover hover:border-white/[0.12] sm:px-4"
    >
      {/* ── Main row ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Status dot — fixed 16px */}
        <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
          {isLive ? (
            <div className="live-dot" />
          ) : isOpen ? (
            <div className="h-2 w-2 rounded-full bg-[var(--gold)]" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-white/20" />
          )}
        </div>

        {/* ── Agent A ── fixed max-width, truncates, never pushes */}
        <div className="flex min-w-0 w-[90px] flex-shrink-0 items-center gap-1.5 sm:w-[140px] sm:gap-2 lg:w-[160px]">
          {a ? (
            <>
              <div
                className="h-4 w-4 flex-shrink-0 rounded-full sm:h-5 sm:w-5"
                style={{
                  background: a.color,
                  boxShadow: isLive ? `0 0 8px ${a.color}80` : "none",
                }}
              />
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold text-white sm:text-sm">
                  {a.name}
                </div>
                {(isLive || isSettled) ? (
                  <PnlBadge value={pnlVal(a)} />
                ) : (
                  <div className="truncate text-[9px] text-[var(--text-muted)] sm:text-[10px]">
                    {a.archetype}
                  </div>
                )}
              </div>
            </>
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">—</span>
          )}
        </div>

        {/* ── Centre: bars / label ── flex-1 shrinks to available space */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 sm:gap-1">
          {isLive && a && b ? (
            <>
              <div className="w-full flex h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${leaderPct}%`, background: leader?.color }}
                />
                <div
                  className="ml-auto h-full rounded-full opacity-50 transition-all duration-1000"
                  style={{ width: `${trailerPct}%`, background: trailer?.color }}
                />
              </div>
              <div className="text-[9px] font-mono text-[var(--text-muted)] tabular-nums sm:text-[10px]">
                {gap > 0 ? `gap ${gap.toFixed(1)}%` : "tied"}
              </div>
            </>
          ) : isSettled && c.winnerId ? (
            <div className="text-[9px] font-semibold text-[var(--gold)] sm:text-[10px]">
              🏆 {c.agents.find(ag => ag.id === c.winnerId)?.name ?? "—"}
            </div>
          ) : isOpen ? (
            <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--gold)] sm:text-[10px]">
              Open seat
            </div>
          ) : (
            <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] sm:text-[10px]">
              VS
            </div>
          )}
        </div>

        {/* ── Agent B ── mirror of Agent A */}
        <div className="flex min-w-0 w-[90px] flex-shrink-0 items-center justify-end gap-1.5 sm:w-[140px] sm:gap-2 lg:w-[160px]">
          {b ? (
            <>
              <div className="min-w-0 text-right">
                <div className="truncate text-[11px] font-semibold text-white sm:text-sm">
                  {b.name}
                </div>
                {(isLive || isSettled) ? (
                  <PnlBadge value={pnlVal(b)} />
                ) : (
                  <div className="truncate text-[9px] text-[var(--text-muted)] sm:text-[10px]">
                    {b.archetype}
                  </div>
                )}
              </div>
              <div
                className="h-4 w-4 flex-shrink-0 rounded-full sm:h-5 sm:w-5"
                style={{
                  background: b.color,
                  boxShadow: isLive ? `0 0 8px ${b.color}80` : "none",
                }}
              />
            </>
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">Waiting…</span>
          )}
        </div>

        {/* ── Timer — compact, fixed width, NEVER overflows ── */}
        <div className="hidden w-[4.5rem] flex-shrink-0 text-right sm:block lg:w-20">
          <RowTimer c={c} isLive={isLive} isOpen={isOpen} isSettled={isSettled} />
        </div>

        {/* ── Action pill ── */}
        <div className="flex w-12 flex-shrink-0 justify-end sm:w-16">
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

      {/* ── Mobile-only timer row (below main row on xs) ── */}
      <div className="mt-1.5 flex items-center justify-end gap-1 sm:hidden">
        <RowTimer c={c} isLive={isLive} isOpen={isOpen} isSettled={isSettled} />
      </div>

      {/* ── Settled detail strip ── */}
      {isSettled && <SettledDetails c={c} />}
    </Link>
  );
}
