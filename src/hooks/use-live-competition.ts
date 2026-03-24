'use client';

import { useState, useEffect, useRef } from 'react';
import type { Competition, TradeEvent } from '@/lib/arena-data';

// SSE-based live competition hook — replaces SWR polling.
// Falls back to a one-time fetch for settled/open competitions.
export function useLiveCompetition(
  initialCompetition: Competition,
  initialTrades:      TradeEvent[]
) {
  const [competition, setCompetition] = useState<Competition>(initialCompetition);
  const [trades,      setTrades]      = useState<TradeEvent[]>(initialTrades);
  const esRef = useRef<EventSource | null>(null);

  const isLive = competition.status === 'live';

  useEffect(() => {
    if (!isLive) return;

    const es = new EventSource(`/api/competitions/${initialCompetition.id}/stream`);
    esRef.current = es;

    es.addEventListener('leaderboard', (e) => {
      try {
        const data = JSON.parse(e.data);
        setCompetition(prev => ({
          ...prev,
          status: data.status,
          agents: data.agents,
        }));
      } catch {}
    });

    es.addEventListener('trades', (e) => {
      try {
        const data = JSON.parse(e.data);
        setTrades(data);
      } catch {}
    });

    es.addEventListener('settled', () => {
      setCompetition(prev => ({ ...prev, status: 'settled' }));
      es.close();
    });

    es.addEventListener('error', () => {
      // On error, close and let the component re-mount if needed
      es.close();
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [initialCompetition.id, isLive]);

  return { competition, trades };
}
