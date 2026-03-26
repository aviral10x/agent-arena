/**
 * Global tick scheduler — runs competition ticks for all live matches.
 *
 * Two independent intervals:
 * - Trading:  TICK_INTERVAL_MS       (default 30s) — slow, market data driven
 * - Sport:    SPORT_TICK_INTERVAL_MS (default 4s)  — fast, real-time matches
 *
 * Each type has its own overlap guard so they never block each other.
 */

import { prisma } from './db';
import { runSportCompetitionTick } from './orchestrator';

const TRADING_TICK_MS     = parseInt(process.env.TICK_INTERVAL_MS       ?? '30000');
const SPORT_TICK_MS       = parseInt(process.env.SPORT_TICK_INTERVAL_MS  ?? '4000');
const MAX_CONCURRENT_TICKS = 3;

// Module-level singleton (survives hot reloads in dev)
const g = globalThis as typeof globalThis & {
  __tickScheduler?:      ReturnType<typeof setInterval> | null;
  __sportTickScheduler?: ReturnType<typeof setInterval> | null;
  __tradingTickRunning?: boolean;
  __sportTickRunning?:   boolean;
};

async function tickByType(type: 'trading' | 'sport') {
  const runningKey = type === 'sport' ? '__sportTickRunning' : '__tradingTickRunning';

  if (g[runningKey]) {
    // previous cycle still running — skip silently
    return;
  }
  g[runningKey] = true;

  try {
    // Auto-clear stale isTicking locks older than 60s (crash recovery)
    await prisma.competition.updateMany({
      where: { isTicking: true, updatedAt: { lt: new Date(Date.now() - 60_000) } },
      data: { isTicking: false },
    }).catch(() => {});

    const liveComps = await prisma.competition.findMany({
      where: { status: 'live', type },
      select: { id: true, title: true, type: true },
    });

    if (liveComps.length === 0) return;

    for (let i = 0; i < liveComps.length; i += MAX_CONCURRENT_TICKS) {
      const batch = liveComps.slice(i, i + MAX_CONCURRENT_TICKS);
      await Promise.allSettled(
        batch.map(async (comp) => {
          try {
            const results = await runSportCompetitionTick(comp.id);
            const r = results[0];
            if (r && (r as any).sport) {
              const desc = (r as any).result?.description;
              if (desc) console.log(`[sport] ${comp.title}: ${desc.slice(0, 70)}`);
            }
          } catch (err: any) {
            if (err.message?.includes('not live') || err.message?.includes('settled')) return;
            console.error(`[tick] ${type} ${comp.id}: ${err.message?.slice(0, 100)}`);
          }
        })
      );
    }
  } catch (err) {
    console.error(`[tick-scheduler] ${type} cycle error:`, err);
  } finally {
    g[runningKey] = false;
  }
}

export function startTickScheduler() {
  if (g.__tickScheduler && g.__sportTickScheduler) {
    console.log('[tick-scheduler] Already running');
    return;
  }

  console.log(`[tick-scheduler] Starting — trading: ${TRADING_TICK_MS}ms | sport: ${SPORT_TICK_MS}ms`);

  // Run both immediately
  tickByType('trading').catch(() => {});
  tickByType('sport').catch(() => {});

  // Trading interval (slow)
  if (!g.__tickScheduler) {
    g.__tickScheduler = setInterval(() => {
      tickByType('trading').catch(() => {});
    }, TRADING_TICK_MS);
  }

  // Sport interval (fast)
  if (!g.__sportTickScheduler) {
    g.__sportTickScheduler = setInterval(() => {
      tickByType('sport').catch(() => {});
    }, SPORT_TICK_MS);
  }
}

export function stopTickScheduler() {
  if (g.__tickScheduler) {
    clearInterval(g.__tickScheduler);
    g.__tickScheduler = null;
  }
  if (g.__sportTickScheduler) {
    clearInterval(g.__sportTickScheduler);
    g.__sportTickScheduler = null;
  }
  console.log('[tick-scheduler] Stopped');
}
