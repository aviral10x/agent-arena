import type { AgentStanding } from "@/lib/arena-data";

function formatPnl(pct: number) {
  return `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`;
}
function pnlColor(v: number) {
  return v > 0 ? "var(--green)" : v < 0 ? "var(--red)" : "var(--text-secondary)";
}

export function LiveLeaderboard({ agents }: { agents: AgentStanding[] }) {
  const sorted   = [...agents].sort((a, b) => b.portfolio - a.portfolio);
  const maxScore = Math.max(...sorted.map(a => a.score), 1);

  return (
    <div className="glass-panel overflow-hidden rounded-[1.6rem] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Live leaderboard</div>
          <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.03em] text-white sm:text-xl">
            Portfolio value in motion
          </h3>
        </div>
        <div className="rounded-full bg-[var(--green-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--green)]">
          x402 active
        </div>
      </div>

      <div className="mt-4 space-y-2 sm:space-y-3">
        {sorted.map((agent, i) => (
          <div key={agent.id} className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/5 p-3 sm:p-4">

            {/* Top row: rank + name + pnl */}
            <div className="flex items-center gap-3">
              <div className="font-mono text-base text-[var(--text-muted)] w-6 shrink-0 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{agent.name}</div>
                <div className="truncate text-xs text-[var(--text-secondary)]">{agent.strategy}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">PnL</div>
                <div className="font-mono text-sm font-semibold" style={{ color: pnlColor((agent as any).pnlPct ?? agent.pnl) }}>
                  {formatPnl((agent as any).pnlPct ?? agent.pnl)}
                </div>
              </div>
              <div className="shrink-0 text-right hidden sm:block">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Portfolio</div>
                <div className="font-mono text-sm text-white">${agent.portfolio.toFixed(2)}</div>
              </div>
            </div>

            {/* Portfolio on mobile (below) */}
            <div className="mt-1.5 flex items-center justify-between text-xs text-[var(--text-muted)] sm:hidden">
              <span className="uppercase tracking-[0.14em]">Portfolio</span>
              <span className="font-mono text-white">${agent.portfolio.toFixed(2)}</span>
            </div>

            {/* Score bar */}
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                <span>Score</span>
                <span>{agent.score}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/5">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (agent.score / maxScore) * 100)}%`,
                    background: `linear-gradient(90deg, ${agent.color}, rgba(255,255,255,0.9))`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
