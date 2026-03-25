'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useLiveCompetition } from '@/hooks/use-live-competition';
import { LiveLeaderboard } from './live-leaderboard';
import { TradeTimeline } from './trade-timeline';
import { LiveMatchRunner } from './live-match-runner';
import { PortfolioBars } from './portfolio-bars';
import type { Competition, TradeEvent } from '@/lib/arena-data';

const PriceTicker = dynamic(
  () => import('./price-ticker').then((m) => ({ default: m.PriceTicker })),
  { ssr: false, loading: () => <div className="h-10 rounded-[1rem] border border-white/10 bg-black/40 animate-pulse" /> }
);

interface Toast { id: string; text: string; color: string; }

type Layout = 'full' | 'leaderboard-only' | 'timeline-only';

export function LiveMatchWrapper({
  initialCompetition,
  initialTrades,
  layout = 'full',
}: {
  initialCompetition: Competition;
  initialTrades: TradeEvent[];
  layout?: Layout;
}) {
  const { competition, trades } = useLiveCompetition(initialCompetition, initialTrades);
  const isLive = competition.status === 'live';
  const isSettled = competition.status === 'settled';

  // Toasts for live trades
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastTradeIdRef = useRef<string>('');

  useEffect(() => {
    if (!isLive || trades.length === 0) return;
    const latest = trades[0];
    if (!latest || latest.id === lastTradeIdRef.current) return;
    lastTradeIdRef.current = latest.id;
    if (latest.type === 'HOLD') return;

    const agent = competition.agents.find((a) => a.id === latest.agentId);
    if (!agent) return;

    const rationale = latest.rationale?.slice(0, 48) ?? '';
    const color = (agent as any).color ?? '#66e3ff';
    const id = `${latest.id}-${Date.now()}`;
    setToasts((prev) => [...prev.slice(-3), {
      id,
      text: `${agent.name} ${latest.type} ${latest.pair} — ${rationale}${rationale.length >= 48 ? '…' : ''}`,
      color,
    }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, [trades, competition.agents, isLive]);

  // ── LEADERBOARD ONLY ──────────────────────────────────────────────
  if (layout === 'leaderboard-only') {
    return (
      <div className="flex flex-col gap-4">
        <LiveMatchRunner competitionId={competition.id} isLive={isLive} />

        {isLive && <PriceTicker />}

        {isLive && competition.agents.length >= 2 && (
          <PortfolioBars agents={competition.agents} />
        )}

        {isSettled && (
          <div className="rounded-2xl border border-[var(--green)]/30 bg-[var(--green-soft)] px-4 py-3 text-sm text-[var(--green)]">
            ✓ Settled — view replay for full trade history
          </div>
        )}

        <LiveLeaderboard agents={competition.agents} />
      </div>
    );
  }

  // ── TIMELINE ONLY ─────────────────────────────────────────────────
  if (layout === 'timeline-only') {
    return (
      <TradeTimeline
        trades={trades}
        vertical          // pass flag to render vertically
        maxHeight="calc(100vh - 200px)"
      />
    );
  }

  // ── FULL (legacy) ─────────────────────────────────────────────────
  return (
    <>
      <LiveMatchRunner competitionId={competition.id} isLive={isLive} />
      {isLive && <PriceTicker />}
      {isSettled && (
        <div className="rounded-2xl border border-[var(--green)]/30 bg-[var(--green-soft)] px-4 py-3 text-sm text-[var(--green)]">
          ✓ Competition settled — open the replay to review the full trade history.
        </div>
      )}
      {isLive && competition.agents.length >= 2 && (
        <PortfolioBars agents={competition.agents} />
      )}
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <LiveLeaderboard agents={competition.agents} />
        <TradeTimeline trades={trades} />
      </div>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 left-3 right-3 z-50 flex flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-xs">
          {toasts.map((toast) => (
            <div key={toast.id}
              className="rounded-[1.2rem] border bg-[#0a0a0f]/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-xl"
              style={{ borderColor: `${toast.color}60` }}>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: toast.color, boxShadow: `0 0 6px ${toast.color}` }} />
                <span className="leading-5">{toast.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
