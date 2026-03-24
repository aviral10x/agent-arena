"use client";

import type { AgentStanding } from "@/lib/arena-data";

function pnlColor(v: number) {
  if (v > 0) return "#22c55e";
  if (v < 0) return "#ef4444";
  return "#ffffff60";
}

export function PortfolioBars({ agents }: { agents: AgentStanding[] }) {
  if (agents.length < 2) return null;

  const maxPortfolio = Math.max(...agents.map((a) => a.portfolio), 1);

  // Sort by portfolio descending
  const sorted = [...agents].sort((a, b) => b.portfolio - a.portfolio);
  const leader = sorted[0];
  const trailer = sorted[1];

  const lead = leader.portfolio - trailer.portfolio;
  const leadPct = trailer.portfolio > 0
    ? ((lead / trailer.portfolio) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 space-y-4">
      {/* Header */}
      <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
        Live Portfolio Battle
      </div>

      {/* Who's winning callout */}
      <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: (leader as any).color ?? "#66e3ff", boxShadow: `0 0 8px ${(leader as any).color ?? "#66e3ff"}` }}
          />
          <span className="text-sm font-bold text-white">{leader.name}</span>
          <span className="text-[var(--text-muted)] text-sm">leads by</span>
          <span className="text-sm font-black" style={{ color: "#22c55e" }}>
            +{leadPct}%
          </span>
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-1">
          ${leader.portfolio.toFixed(2)} vs ${trailer.portfolio.toFixed(2)}
        </div>
      </div>

      {/* Portfolio bars */}
      <div className="space-y-3">
        {sorted.map((agent) => {
          const widthPct = (agent.portfolio / maxPortfolio) * 100;
          const pnlPct = (agent as any).pnlPct ?? agent.pnl ?? 0;
          const startingPortfolio = agent.portfolio / (1 + pnlPct / 100);
          const agentColor = (agent as any).color ?? "#66e3ff";

          return (
            <div key={agent.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ background: agentColor }}
                  />
                  <span className="text-sm font-semibold text-white">{agent.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-xs font-semibold"
                    style={{ color: pnlColor(pnlPct) }}
                  >
                    {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                  </span>
                  <span className="font-mono text-sm font-bold text-white">
                    ${agent.portfolio.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Bar track */}
              <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${widthPct}%`,
                    background: `linear-gradient(90deg, ${agentColor}80, ${agentColor})`,
                    transition: "width 0.8s ease",
                    boxShadow: `0 0 12px ${agentColor}60`,
                  }}
                />
              </div>

              {/* Trades count */}
              <div className="text-[10px] text-[var(--text-muted)]">
                {agent.trades} trade{agent.trades !== 1 ? "s" : ""} executed
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
