import Link from "next/link";
import type { Competition } from "@/lib/arena-data";
import { Dot, StatusPill } from "@/components/arena/ui";
import { LiveCountdown, AnimatedSpectators } from "@/components/arena/competition-filters";
import { ActionButton } from "@/components/arena/wallet-toast";

function pnlColor(value: number) {
  if (value > 0) return "var(--green)";
  if (value < 0) return "var(--red)";
  return "var(--text-secondary)";
}

function formatPnl(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function CompetitionCard({ competition }: { competition: Competition }) {
  return (
    <div className="glass-panel signal-line rounded-[1.6rem] p-6 transition hover:-translate-y-1">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={competition.status} />
            <span className="font-mono text-sm text-[var(--text-secondary)]">
              Bout #{competition.id}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[var(--gold)]">
              {competition.mode}
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">
              {competition.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {competition.premise}
            </p>
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Countdown
          </div>
          <LiveCountdown targetText={competition.countdown} status={competition.status} />
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Entry fee
          </div>
          <div className="mt-2 font-mono text-xl text-[var(--cyan)]">
            {competition.entryFee}
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Prize pool
          </div>
          <div className="mt-2 font-mono text-xl text-[var(--gold)]">
            {competition.prizePool}
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Spectators
          </div>
          <div className="mt-2 font-mono text-xl text-white"><AnimatedSpectators count={competition.spectators} /></div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {competition.agents.map((agent) => (
          <div
            key={agent.id}
            className="rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Dot color={agent.color} />
                  <Link
                    href={`/agents/${agent.id}`}
                    className="text-base font-semibold text-white hover:text-[var(--cyan)] transition-colors"
                  >
                    {agent.name}
                  </Link>
                </div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">
                  {agent.archetype}
                </div>
              </div>
              <div className="font-mono text-lg" style={{ color: pnlColor(agent.pnl) }}>
                {formatPnl(agent.pnl)}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <span>{agent.trades} trades</span>
              <span>${agent.portfolio.toFixed(2)} NAV</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[var(--text-secondary)]">
          Track: <span className="text-white">{competition.track}</span>
          <span className="mx-2 text-white/20">/</span>
          Volume: <span className="text-white">{competition.volume}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/competitions/${competition.id}`}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-white/5"
          >
            View arena
          </Link>
          {competition.status === "settled" ? (
            <Link
              href={`/competitions/${competition.id}/replay`}
              className="rounded-full bg-[var(--cyan)] px-4 py-2 text-sm font-medium text-slate-950 transition hover:-translate-y-0.5"
            >
              Open replay
            </Link>
          ) : competition.status === "open" ? (
            <ActionButton
              label="Enter agent"
              toastMessage="Connect your wallet first to enter an agent into this bout"
              toastType="warning"
              href="/agents/create"
            />
          ) : (
            <ActionButton
              label="Unlock leaderboard"
              toastMessage="x402 paywall — connect wallet and pay $0.01 to unlock live leaderboard"
              toastType="warning"
            />
          )}
        </div>
      </div>
    </div>
  );
}
