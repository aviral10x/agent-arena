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
}

function pnlVal(a: Agent) { return (a as any).pnlPct ?? a.pnl ?? 0; }

function PnlBadge({ value }: { value: number }) {
  const up = value > 0;
  const zero = value === 0;
  return (
    <span
      className="font-mono text-sm font-bold tabular-nums"
      style={{ color: zero ? "var(--text-muted)" : up ? "var(--green)" : "var(--red)" }}
    >
      {up ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

export function CompetitionRow({ competition: c }: { competition: RowCompetition }) {
  const [a, b] = c.agents;
  const isLive    = c.status === "live";
  const isOpen    = c.status === "open";
  const isSettled = c.status === "settled";

  const gap = a && b ? Math.abs(pnlVal(a) - pnlVal(b)) : 0;
  const leader = a && b ? (pnlVal(a) >= pnlVal(b) ? a : b) : a;
  const trailer = a && b ? (pnlVal(a) >= pnlVal(b) ? b : a) : b;

  // Bar width: leader advantage visualised
  const maxAbs = Math.max(Math.abs(pnlVal(a ?? {})), Math.abs(pnlVal(b ?? {})), 0.01);
  const leaderBar = Math.min(100, 50 + (gap / maxAbs) * 40);
  const trailerBar = Math.max(10, 100 - leaderBar);

  return (
    <Link
      href={`/competitions/${c.id}`}
      className="group block rounded-2xl border border-white/[0.06] bg-[var(--bg-card)] px-4 py-3 transition row-hover hover:border-white/[0.12]"
    >
      <div className="flex items-center gap-3">

        {/* Status dot */}
        <div className="flex-shrink-0 w-5 flex justify-center">
          {isLive ? (
            <div className="live-dot" />
          ) : isOpen ? (
            <div className="h-2 w-2 rounded-full bg-[var(--gold)]" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-white/20" />
          )}
        </div>

        {/* Agent A */}
        {a ? (
          <div className="flex items-center gap-2 w-[140px] sm:w-[180px] flex-shrink-0 min-w-0">
            <div
              className="h-5 w-5 flex-shrink-0 rounded-full"
              style={{ background: a.color, boxShadow: isLive ? `0 0 8px ${a.color}80` : "none" }}
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{a.name}</div>
              {isLive || isSettled ? (
                <PnlBadge value={pnlVal(a)} />
              ) : (
                <div className="text-[10px] text-[var(--text-muted)]">{a.archetype}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-[140px] sm:w-[180px] flex-shrink-0 text-xs text-[var(--text-muted)]">—</div>
        )}

        {/* Centre: VS / battle bars / gap */}
        <div className="flex-1 flex flex-col items-center gap-1 min-w-0 px-2">
          {isLive && a && b ? (
            <>
              {/* Battle bars */}
              <div className="w-full flex h-1.5 rounded-full overflow-hidden bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${leaderBar}%`, background: leader?.color }}
                />
                <div
                  className="h-full rounded-full transition-all duration-1000 ml-auto"
                  style={{ width: `${trailerBar}%`, background: trailer?.color, opacity: 0.5 }}
                />
              </div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums">
                {gap > 0 ? `gap ${gap.toFixed(1)}%` : "tied"}
              </div>
            </>
          ) : isSettled && c.winnerId ? (
            <div className="text-[10px] text-[var(--gold)] font-semibold">
              🏆 {c.agents.find(ag => ag.id === c.winnerId)?.name ?? "—"}
            </div>
          ) : isOpen ? (
            <div className="text-[10px] text-[var(--gold)] font-semibold uppercase tracking-widest">
              Open seat
            </div>
          ) : (
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">VS</div>
          )}
        </div>

        {/* Agent B */}
        {b ? (
          <div className="flex items-center gap-2 w-[140px] sm:w-[180px] flex-shrink-0 min-w-0 justify-end">
            <div className="min-w-0 text-right">
              <div className="truncate text-sm font-semibold text-white">{b.name}</div>
              {isLive || isSettled ? (
                <PnlBadge value={pnlVal(b)} />
              ) : (
                <div className="text-[10px] text-[var(--text-muted)]">{b.archetype}</div>
              )}
            </div>
            <div
              className="h-5 w-5 flex-shrink-0 rounded-full"
              style={{ background: b.color, boxShadow: isLive ? `0 0 8px ${b.color}80` : "none" }}
            />
          </div>
        ) : (
          <div className="w-[140px] sm:w-[180px] flex-shrink-0 text-xs text-[var(--text-muted)] text-right">
            Waiting…
          </div>
        )}

        {/* Timer */}
        <div className="hidden sm:block w-20 flex-shrink-0 text-right">
          {isLive ? (
            <LiveCountdown
              targetText={c.countdown}
              status="live"
              startedAt={c.startedAt}
              durationSeconds={c.durationSeconds}
            />
          ) : isSettled ? (
            <span className="text-xs text-[var(--text-muted)]">Done</span>
          ) : (
            <span className="text-xs text-[var(--gold)]">Open</span>
          )}
        </div>

        {/* Action */}
        <div className="flex-shrink-0 w-16 text-right">
          {isLive ? (
            <span className="rounded-full bg-[var(--teal)]/12 border border-[var(--teal)]/25 px-2.5 py-1 text-[10px] font-bold text-[var(--teal)] group-hover:bg-[var(--teal)]/20 transition">
              Watch
            </span>
          ) : isOpen ? (
            <span className="rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/25 px-2.5 py-1 text-[10px] font-bold text-[var(--gold)] group-hover:bg-[var(--gold)]/20 transition">
              Enter
            </span>
          ) : (
            <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-[var(--text-muted)] group-hover:bg-white/10 transition">
              Replay
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
