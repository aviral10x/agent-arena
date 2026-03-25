/**
 * Global tick scheduler — automatically runs competition ticks for all live matches.
 * 
 * Runs as a singleton in the Next.js server process. 
 * Ticks every TICK_INTERVAL_MS (default 30s) for each live competition.
 * Self-recovers from errors and prevents duplicate schedulers.
 */

import { prisma } from './db';
import { runCompetitionTick } from './orchestrator';

const TICK_INTERVAL_MS = parseInt(process.env.TICK_INTERVAL_MS ?? '30000'); // 30s default
const MAX_CONCURRENT_TICKS = 3; // Don't overwhelm the server

// Module-level singleton — survives hot reloads in dev
const globalForScheduler = globalThis as typeof globalThis & {
  __tickScheduler?: ReturnType<typeof setInterval> | null;
  __tickRunning?: boolean;
};

async function tickAllLive() {
  // Guard against overlapping runs
  if (globalForScheduler.__tickRunning) {
    console.log('[tick-scheduler] Previous tick cycle still running, skipping');
    return;
  }

  globalForScheduler.__tickRunning = true;

  try {
    const liveComps = await prisma.competition.findMany({
      where: { status: 'live' },
      select: { id: true, title: true, startedAt: true, durationSeconds: true },
    });

    if (liveComps.length === 0) return;

    console.log(`[tick-scheduler] Ticking ${liveComps.length} live competition(s)`);

    // Process in batches to avoid overwhelming the server
    for (let i = 0; i < liveComps.length; i += MAX_CONCURRENT_TICKS) {
      const batch = liveComps.slice(i, i + MAX_CONCURRENT_TICKS);
      await Promise.allSettled(
        batch.map(async (comp) => {
          try {
            const results = await runCompetitionTick(comp.id);
            const actions = results.filter((r: any) => r.action && r.action !== 'HOLD');
            if (actions.length > 0) {
              console.log(`[tick-scheduler] ${comp.title}: ${actions.length} trade(s)`);
            }
          } catch (err: any) {
            // Don't crash the scheduler on individual tick failures
            if (err.message?.includes('not live') || err.message?.includes('settled')) {
              // Competition ended between our query and tick — expected race condition
              return;
            }
            console.error(`[tick-scheduler] Tick failed for ${comp.id}:`, err.message?.slice(0, 120));
          }
        })
      );
    }
  } catch (err) {
    console.error('[tick-scheduler] Cycle error:', err);
  } finally {
    globalForScheduler.__tickRunning = false;
  }
}

export function startTickScheduler() {
  // Prevent duplicate schedulers (important in dev with hot reload)
  if (globalForScheduler.__tickScheduler) {
    console.log('[tick-scheduler] Already running');
    return;
  }

  console.log(`[tick-scheduler] Starting — interval ${TICK_INTERVAL_MS}ms`);

  // Run immediately on start, then on interval
  tickAllLive().catch(() => {});

  globalForScheduler.__tickScheduler = setInterval(() => {
    tickAllLive().catch(() => {});
  }, TICK_INTERVAL_MS);
}

export function stopTickScheduler() {
  if (globalForScheduler.__tickScheduler) {
    clearInterval(globalForScheduler.__tickScheduler);
    globalForScheduler.__tickScheduler = null;
    console.log('[tick-scheduler] Stopped');
  }
}
