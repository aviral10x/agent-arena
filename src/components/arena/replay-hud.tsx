import { useState, type ReactNode } from "react";
import { cx } from "@/components/arena/ui";
import { TweakModal } from "./tweak-modal";

export type ReplayHudAgent = {
  id: string;
  name: string;
  archetype?: string;
  color: string;
  level: string;
  shield: number;
  xp: number;
  pnl: number;
  streak: number;
  action: string;
  position?: "northwest" | "northeast" | "southwest" | "southeast";
};

export type ReplayHudTrade = {
  id: string;
  time: string;
  block: string;
  agentId: string;
  pair: string;
  side: "BUY" | "SELL" | "HOLD";
  amount: string;
  impact: string;
  note: string;
};

export type ReplayHudDamageFloat = {
  id: string;
  agentId?: string;
  label: string;
  positive?: boolean;
  tone?: string;
};

export type ReplayHudCritBanner = {
  label: string;
  tone?: string;
};

export type ReplayHudProps = {
  title: string;
  subtitle?: string;
  roundLabel: string;
  roundValue: string;
  prizeLabel: string;
  prizeValue: string;
  liveLabel?: string;
  timerLabel?: string;
  timerValue: string;
  blockLabel?: string;
  blockValue?: string;
  agents: ReplayHudAgent[];
  trades: ReplayHudTrade[];
  damageFloats?: ReplayHudDamageFloat[];
  critBanner?: ReplayHudCritBanner | null;
  className?: string;
  footer?: ReactNode;
};

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatStreak(value: number) {
  if (value > 0) {
    return `W${value}${value >= 5 ? " ★" : ""}`;
  }

  if (value < 0) {
    return `L${Math.abs(value)}`;
  }

  return "EVEN";
}

function shieldWidth(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

function xpWidth(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

function getAgentAnchor(agent: ReplayHudAgent | undefined, index: number) {
  if (agent?.position) {
    return agent.position;
  }

  return ["northwest", "northeast", "southwest", "southeast"][index % 4] as ReplayHudAgent["position"];
}

function getDamagePosition(
  item: ReplayHudDamageFloat,
  index: number,
  agents: ReplayHudAgent[],
) {
  const agent = agents.find((candidate) => candidate.id === item.agentId);
  const anchor = getAgentAnchor(agent, agent ? agents.indexOf(agent) : index);

  const positions = {
    northwest: { left: "18%", top: "24%" },
    northeast: { left: "82%", top: "24%" },
    southwest: { left: "18%", top: "56%" },
    southeast: { left: "82%", top: "56%" },
  } as const;

  return positions[anchor ?? "northwest"];
}

export function ReplayHud({
  title,
  subtitle,
  roundLabel,
  roundValue,
  prizeLabel,
  prizeValue,
  liveLabel = "LIVE",
  timerLabel = "TRADING ACTIVE",
  timerValue,
  blockLabel = "BLOCK",
  blockValue = "#0000000",
  agents,
  trades,
  damageFloats = [],
  critBanner = null,
  className,
  footer,
}: ReplayHudProps) {
  const [activeTweakAgent, setActiveTweakAgent] = useState<ReplayHudAgent | null>(null);

  return (
    <div
      className={cx(
        "pointer-events-none absolute inset-0 z-20 overflow-hidden",
        "text-[var(--text-primary)]",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 border-b border-white/10 bg-[rgba(4,8,16,0.78)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--green)] shadow-[0_0_0_6px_rgba(73,243,166,0.12)]" />
            <div className="min-w-0">
              <div className="truncate text-xs uppercase tracking-[0.32em] text-[var(--text-muted)]">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-1 truncate text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                {roundLabel}
              </div>
              <div className="mt-1 font-mono text-base text-white">{roundValue}</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                {prizeLabel}
              </div>
              <div className="mt-1 font-mono text-base text-[var(--gold)]">{prizeValue}</div>
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-[0.26em] text-[var(--green)]">
              {liveLabel}
            </div>
            <div className="font-mono text-xs text-[var(--text-secondary)]">{blockValue}</div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(102,227,255,0.08),transparent_30%),radial-gradient(circle_at_20%_20%,rgba(255,212,121,0.08),transparent_24%),radial-gradient(circle_at_80%_35%,rgba(73,243,166,0.08),transparent_22%)]" />

      <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-center sm:block">
        <div className="font-mono text-3xl font-semibold tracking-[0.28em] text-[rgba(102,227,255,0.7)]">
          {timerValue}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.42em] text-[rgba(162,183,212,0.5)]">
          {timerLabel}
        </div>
      </div>

      <div className="absolute inset-x-0 top-[68px] px-4 sm:px-6">
        <div className="grid gap-3 lg:grid-cols-2">
          {agents.map((agent) => (
            <article
              key={agent.id}
              className="glass-panel signal-line rounded-[1.3rem] border-white/10 p-4 shadow-[0_18px_50px_rgba(3,9,19,0.35)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: agent.color }} />
                    <div className="truncate text-base font-semibold text-white">{agent.name}</div>
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    {agent.archetype ?? "Agent core"} / {agent.level}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-sm uppercase tracking-[0.22em]" style={{ color: agent.color }}>
                    {formatPercent(agent.pnl)}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--gold)]">
                    {formatStreak(agent.streak)}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.05rem] border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    <span>Shield</span>
                    <span className="font-mono text-white">{agent.shield}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: shieldWidth(agent.shield), backgroundColor: agent.color }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    <span>XP</span>
                    <span>Lv progress</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/6">
                    <div className="h-full rounded-full bg-[var(--cyan)] transition-[width] duration-500" style={{ width: xpWidth(agent.xp) }} />
                  </div>
                </div>

                <div className="rounded-[1.05rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-3 group relative transition-colors hover:bg-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                      Action
                    </div>
                    <button 
                      onClick={() => setActiveTweakAgent(agent)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] uppercase tracking-[0.25em] border border-white/10 bg-black/40 px-2 py-0.5 rounded-full hover:bg-white/10 hover:text-white"
                      style={{ color: agent.color }}
                    >
                      Tweak Interface
                    </button>
                  </div>
                  <div className="mt-2 min-h-[52px] text-sm leading-6 text-white">
                    {agent.action}
                  </div>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    Position hint
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    {agent.position ?? "Arena vector mapped to live portfolio coordinates"}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[rgba(4,8,16,0.82)] backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <div className="hidden shrink-0 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] sm:block">
            Trade Log
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex gap-3 overflow-x-auto whitespace-nowrap">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="inline-flex shrink-0 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--text-secondary)]"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    {trade.time}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white">
                    {trade.block}
                  </span>
                  <span className="rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-black" style={{ backgroundColor: trade.side === "BUY" ? "var(--green)" : trade.side === "SELL" ? "var(--red)" : "var(--gold)" }}>
                    {trade.side}
                  </span>
                  <span className="text-white">{trade.pair}</span>
                  <span>{trade.amount}</span>
                  <span className="text-[var(--cyan)]">{trade.impact}</span>
                  <span className="hidden max-w-[360px] truncate lg:inline">{trade.note}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)]">
              {blockLabel}
            </div>
            <div className="mt-1 font-mono text-sm text-white">{blockValue}</div>
          </div>
        </div>
      </div>

      {damageFloats.length > 0 ? (
        <div className="absolute inset-0">
          {damageFloats.map((floatItem, index) => {
            const position = getDamagePosition(floatItem, index, agents);

            return (
              <div
                key={floatItem.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] animate-[rise_1.2s_ease_forwards]"
                style={{
                  left: position.left,
                  top: position.top,
                  borderColor: floatItem.tone ?? "rgba(255,255,255,0.16)",
                  color:
                    floatItem.tone ??
                    (floatItem.positive === false ? "var(--text-secondary)" : "var(--green)"),
                  backgroundColor: "rgba(4,8,16,0.68)",
                }}
              >
                {floatItem.label}
              </div>
            );
          })}
        </div>
      ) : null}

      {critBanner ? (
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
          <div
            className="rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.34em] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
            style={{
              borderColor: critBanner.tone ?? "var(--gold)",
              color: critBanner.tone ?? "var(--gold)",
              backgroundColor: "rgba(4,8,16,0.9)",
            }}
          >
            {critBanner.label}
          </div>
        </div>
      ) : null}

      {footer ? <div className="absolute inset-x-0 bottom-16 px-4 sm:px-6">{footer}</div> : null}

      {/* Pop-up Modals */}
      <TweakModal 
        isOpen={!!activeTweakAgent} 
        onClose={() => setActiveTweakAgent(null)}
        agentId={activeTweakAgent?.id || ""}
        agentName={activeTweakAgent?.name || ""}
        agentColor={activeTweakAgent?.color || "#fff"}
        currentArchetype={activeTweakAgent?.archetype || "Momentum"}
      />
    </div>
  );
}
