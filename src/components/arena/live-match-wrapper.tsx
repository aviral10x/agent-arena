'use client';

import { useLiveCompetition } from '@/hooks/use-live-competition';
import { LiveLeaderboard } from './live-leaderboard';
import { TradeTimeline } from './trade-timeline';
import { LiveMatchRunner } from './live-match-runner';
import type { Competition, TradeEvent } from '@/lib/arena-data';

export function LiveMatchWrapper({
  initialCompetition,
  initialTrades,
}: {
  initialCompetition: Competition;
  initialTrades: TradeEvent[];
}) {
  // FIX 2.4: competition.status is SWR-refreshed — LiveMatchRunner sees live updates
  const { competition, trades } = useLiveCompetition(initialCompetition, initialTrades);
  const isLive = competition.status === 'live';

  return (
    <>
      <LiveMatchRunner competitionId={competition.id} isLive={isLive} />

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

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <LiveLeaderboard agents={competition.agents} />
        <TradeTimeline trades={trades} />
      </div>
    </>
  );
}
