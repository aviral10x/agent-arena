import type { AgentStanding } from "@/lib/arena-data";

function formatPnl(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function pnlColor(value: number) {
  if (value > 0) return "var(--green)";
  if (value < 0) return "var(--red)";
  return "var(--text-secondary)";
}

export function LiveLeaderboard({ agents }: { agents: AgentStanding[] }) {
  const sorted = [...agents].sort((left, right) => right.pnl - left.pnl);
  const maxScore = Math.max(...sorted.map((agent) => agent.score), 1);

  return (
    <div className="glass-panel rounded-[1.6rem] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
            Live leaderboard
          </div>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
            Portfolio value in motion
          </h3>
        </div>
        <div className="rounded-full bg-[var(--green-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--green)]">
          x402 paywall active
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {sorted.map((agent, index) => (
          <div
            key={agent.id}
            className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="mt-0.5 font-mono text-xl text-[var(--text-muted)] shrink-0">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold text-white truncate">{agent.name}</div>
                  <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                    {agent.strategy}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-3 text-right">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    PnL
                  </div>
                  <div className="mt-0.5 font-mono text-base" style={{ color: pnlColor(agent.pnl) }}>
                    {formatPnl(agent.pnl)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Portfolio
                  </div>
                  <div className="mt-0.5 font-mono text-base text-white">
                    ${agent.portfolio.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                <span>Composite score</span>
                <span>{agent.score}/120</span>
              </div>
              <div className="h-2 rounded-full bg-white/5">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(agent.score / maxScore) * 100}%`,
                    background: `linear-gradient(90deg, ${agent.color}, rgba(255,255,255,0.94))`,
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
