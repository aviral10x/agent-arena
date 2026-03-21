import useSWR from 'swr';
import type { Competition, TradeEvent } from '@/lib/arena-data';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useLiveCompetition(initialCompetition: Competition, initialTrades: TradeEvent[]) {
  const isLive = initialCompetition.status === 'live';

  const { data: competition } = useSWR<Competition>(
    isLive ? `/api/competitions/${initialCompetition.id}` : null,
    fetcher,
    {
      fallbackData: initialCompetition,
      refreshInterval: isLive ? 3000 : 0,
    }
  );

  const { data: trades } = useSWR<TradeEvent[]>(
    isLive ? `/api/competitions/${initialCompetition.id}/trades` : null,
    fetcher,
    {
      fallbackData: initialTrades,
      refreshInterval: isLive ? 3000 : 0,
    }
  );

  return {
    competition: competition ?? initialCompetition,
    trades: trades ?? initialTrades,
  };
}
