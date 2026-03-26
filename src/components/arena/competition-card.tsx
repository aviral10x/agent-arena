"use client";

import Link from "next/link";
import type { Competition } from "@/lib/arena-data";
import { Dot, StatusPill } from "@/components/arena/ui";
import { LiveCountdown, AnimatedSpectators } from "@/components/arena/competition-filters";
import { X402ButtonClient as X402Button } from "@/components/arena/x402-btn-client";

function pnlColor(v: number) {
  return v > 0 ? "var(--green)" : v < 0 ? "var(--red)" : "var(--text-secondary)";
}
function formatPnl(v: number) {
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function sportEmoji(sport: string | undefined) {
  if (sport === "tennis") return "🎾";
  if (sport === "table-tennis") return "🏓";
  return "🏸";
}

export function CompetitionCard({ competition }: { competition: Competition }) {
  const isSport = (competition as any).type === "sport";
  const sport   = (competition as any).sport;

  return (
    <div
      className="signal-line overflow-hidden rounded-[1.6rem] p-4 sm:p-6 transition hover:-translate-y-0.5"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid rgba(0,240,255,0.08)',
        borderRadius: '1.6rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,240,255,0.2)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(0,240,255,0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,240,255,0.08)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
      }}
    >

      {/* Header: title + countdown */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={competition.status} />
            <span className="font-mono text-xs text-[var(--text-secondary)]">#{competition.id.slice(0,8)}</span>
            <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs uppercase tracking-[0.18em] text-[var(--gold)]">
              {competition.mode}
            </span>
            {isSport && (
              <span className="rounded-full border border-[var(--teal)]/25 bg-[var(--teal)]/8 px-2.5 py-0.5 text-xs text-[var(--teal)]">
                {sportEmoji(sport)} {sport ?? "badminton"}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-white sm:text-xl">
            {competition.title}
          </h3>
          <p className="text-sm leading-6 text-[var(--text-secondary)] line-clamp-2 sm:line-clamp-none">
            {competition.premise}
          </p>
        </div>
        <div className="shrink-0 min-w-0 rounded-[1.1rem] border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3 sm:text-right">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Countdown</div>
          <div className="max-w-[160px] sm:max-w-none">
            <LiveCountdown targetText={competition.countdown} status={competition.status} />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Entry fee",  value: competition.entryFee,  color: "var(--cyan)" },
          { label: "Prize pool", value: competition.prizePool, color: "var(--gold)" },
          { label: "Spectators", value: null,                  color: "white"       },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-[1.1rem] border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
            <div className="mt-1.5 font-mono text-base sm:text-lg" style={{ color }}>
              {value ?? <AnimatedSpectators count={competition.spectators} />}
            </div>
          </div>
        ))}
      </div>

      {/* Agent rows */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {competition.agents.map(agent => (
          <div key={agent.id} className="overflow-hidden rounded-[1.1rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Dot color={agent.color} />
                  <Link href={`/agents/${agent.id}`}
                    className="truncate text-sm font-semibold text-white hover:text-[var(--cyan)] transition-colors">
                    {agent.name}
                  </Link>
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-secondary)] truncate">{agent.archetype}</div>
              </div>
              {isSport ? (
                <div className="shrink-0 font-mono text-sm text-[var(--teal)]">
                  {(agent as any).score ?? 0} pts
                </div>
              ) : (
                <div className="shrink-0 font-mono text-sm" style={{ color: pnlColor((agent as any).pnlPct ?? agent.pnl) }}>
                  {formatPnl((agent as any).pnlPct ?? agent.pnl)}
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {isSport ? (
                <>
                  <span>{agent.trades} rallies</span>
                  <span>{(agent as any).score ?? 0} points</span>
                </>
              ) : (
                <>
                  <span>{agent.trades} trades</span>
                  <span>${agent.portfolio.toFixed(2)} NAV</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[var(--text-secondary)]">
          {isSport ? (
            <>
              <span>{sportEmoji(sport)} {sport ?? "badminton"}</span>
              <span className="mx-1.5 text-white/20">/</span>
              <span>
                {competition.agents[0] && competition.agents[1]
                  ? `${(competition.agents[0] as any).score ?? 0} – ${(competition.agents[1] as any).score ?? 0}`
                  : "—"} pts
              </span>
            </>
          ) : (
            <>
              <span>{competition.track}</span>
              <span className="mx-1.5 text-white/20">/</span>
              <span>{competition.volume ?? `$${((competition as any).volumeUsd/1000).toFixed(1)}k`}</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/competitions/${competition.id}`}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-[var(--text-primary)] transition hover:bg-white/5">
            View arena
          </Link>
          {competition.status === "settled" ? (
            <Link href={`/competitions/${competition.id}/result`}
              className="rounded-full bg-[var(--cyan)] px-4 py-2 text-xs font-medium text-slate-950 transition hover:-translate-y-0.5">
              View result
            </Link>
          ) : competition.status === "open" ? (
            <X402Button label="Enter agent" amount={0.01} redirectHref="/agents/create" />
          ) : (
            <X402Button label="Unlock leaderboard" amount={0.01} redirectHref={`/competitions/${competition.id}`} />
          )}
        </div>
      </div>
    </div>
  );
}
