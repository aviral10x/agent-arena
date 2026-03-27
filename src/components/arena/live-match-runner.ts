'use client';

import { useEffect, useRef } from 'react';

const CRON_SECRET = process.env.NEXT_PUBLIC_CRON_SECRET ?? '';
// Each tick computes an ENTIRE rally (5-15 shots) using instant physics engine.
// Server compute: <100ms. Client animation: ~3-6s.
// Tick fires every 4s — next rally starts as soon as animation finishes.
const TICK_INTERVAL_MS = 4_000;

export function LiveMatchRunner({
  competitionId,
  isLive,
}: {
  competitionId: string;
  isLive: boolean; // FIX 2.4: driven from SWR-refreshed status in LiveMatchWrapper
}) {
  const mounted   = useRef(false);
  const tickingRef = useRef(false);

  useEffect(() => {
    if (!isLive) return; // FIX 2.3: stop immediately when status is no longer live

    mounted.current = true;

    const tick = async () => {
      if (!mounted.current || tickingRef.current) return;
      tickingRef.current = true;
      try {
        await fetch(`/api/competitions/${competitionId}/tick`, {
          method:  'POST',
          headers: CRON_SECRET ? { 'x-cron-secret': CRON_SECRET } : {},
        });
      } catch (err) {
        console.error('Tick failed', err);
      } finally {
        tickingRef.current = false;
      }
    };

    const interval = setInterval(tick, TICK_INTERVAL_MS);
    tick(); // immediate first tick

    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [competitionId, isLive]); // re-run if isLive changes

  return null;
}
