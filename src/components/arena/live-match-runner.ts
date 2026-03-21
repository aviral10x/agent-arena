"use client";

import { useEffect, useRef } from "react";

export function LiveMatchRunner({ competitionId, isLive }: { competitionId: string; isLive: boolean }) {
  const mounted = useRef(false);

  useEffect(() => {
    if (!isLive) return;
    mounted.current = true;

    const tick = async () => {
      if (!mounted.current) return;
      try {
        await fetch(`/api/competitions/${competitionId}/tick`, { method: "POST" });
      } catch (err) {
        console.error("Tick failed", err);
      }
    };

    // Run a tick every 10 seconds to simulate real-time AI trading
    const interval = setInterval(tick, 10000);
    
    // Initial kick to get trades flowing immediately on load
    tick();

    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [competitionId, isLive]);

  return null; // Invisible driver component
}
