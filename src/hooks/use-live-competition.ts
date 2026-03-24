import useSWR from 'swr';
import type { Competition, TradeEvent } from '@/lib/arena-data';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// FIX 4.5: align poll with tick interval — no point polling faster than ticks fire
const POLL_INTERVAL_MS = 10_000;

export function useLiveCompetition(initialCompetition: Competition, initialTrades: TradeEvent[]) {
  const isLive = initialCompetition.status === 'live';

  const { data: competition } = useSWR<Competition>(
    isLive ? `/api/competitions/${initialCompetition.id}` : null,
    fetcher,
    {
      fallbackData: initialCompetition,
      refreshInterval: POLL_INTERVAL_MS,
    }
  );

  const { data: trades } = useSWR<TradeEvent[]>(
    // FIX 2.3: use live status from SWR data, not stale initial prop
    competition?.status === 'live' ? `/api/competitions/${initialCompetition.id}/trades` : null,
    fetcher,
    {
      fallbackData: initialTrades,
      refreshInterval: POLL_INTERVAL_MS,
    }
  );

  return {
    competition: competition ?? initialCompetition,
    trades:      trades ?? initialTrades,
  };
}
