'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useLiveCompetition } from '@/hooks/use-live-competition';
import { LiveLeaderboard } from './live-leaderboard';
import { TradeTimeline } from './trade-timeline';
import { LiveMatchRunner } from './live-match-runner';
import { PortfolioBars } from './portfolio-bars';
import type { Competition, TradeEvent } from '@/lib/arena-data';

// Dynamic import for PriceTicker (uses external fetch)
const PriceTicker = dynamic(
  () => import('./price-ticker').then((m) => ({ default: m.PriceTicker })),
  { ssr: false, loading: () => <div className="h-10 rounded-[1rem] border border-white/10 bg-black/40 animate-pulse" /> }
);

interface Toast {
  id: string;
  text: string;
  color: string;
}

export function LiveMatchWrapper({
  initialCompetition,
  initialTrades,
}: {
  initialCompetition: Competition;
  initialTrades: TradeEvent[];
}) {
  const { competition, trades } = useLiveCompetition(initialCompetition, initialTrades);
  const isLive = competition.status === 'live';

  // Highlight toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastTradeIdRef = useRef<string>('');

  useEffect(() => {
    if (!isLive || trades.length === 0) return;
    const latest = trades[0];
    if (!latest || latest.id === lastTradeIdRef.current) return;
    lastTradeIdRef.current = latest.id;

    if (latest.type === 'HOLD') return; // don't toast for holds

    const agent = competition.agents.find((a) => a.id === latest.agentId);
    if (!agent) return;

    const rationale = latest.rationale?.slice(0, 48) ?? '';
    const toastText = `${agent.name} ${latest.type} ${latest.pair} — ${rationale}${rationale.length >= 48 ? '…' : ''}`;
    const color = (agent as any).color ?? '#66e3ff';

    const id = `${latest.id}-${Date.now()}`;
    setToasts((prev) => [...prev.slice(-3), { id, text: toastText, color }]);

    // Auto-remove after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, [trades, competition.agents, isLive]);

  return (
    <>
      <LiveMatchRunner competitionId={competition.id} isLive={isLive} />

      {/* Phase 6: Live price ticker */}
      {isLive && <PriceTicker />}

      {/* FIX 5.2: warn when no API key (mock mode) */}
      {isLive && !process.env.NEXT_PUBLIC_HAS_OPENAI && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          ⚠️ No OpenAI key set — agents are running on mock decisions.
        </div>
      )}

      {competition.status === 'settled' && (
        <div className="rounded-2xl border border-[var(--green)]/30 bg-[var(--green-soft)] px-4 py-3 text-sm text-[var(--green)]">
          ✓ Competition settled — open the replay to review the full trade history.
        </div>
      )}

      {/* Phase 6: Portfolio battle bars */}
      {isLive && competition.agents.length >= 2 && (
        <PortfolioBars agents={competition.agents} />
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <LiveLeaderboard agents={competition.agents} />
        <TradeTimeline trades={trades} />
      </div>

      {/* Phase 6: Highlight toasts — fixed bottom-right */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-xs">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="rounded-[1.2rem] border bg-[#0a0a0f]/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-5 fade-in duration-200"
              style={{ borderColor: `${toast.color}60` }}
            >
              <div className="flex items-start gap-2">
                <div
                  className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: toast.color, boxShadow: `0 0 6px ${toast.color}` }}
                />
                <span className="leading-5">{toast.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
