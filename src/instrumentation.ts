/**
 * Next.js instrumentation hook — runs once on server startup.
 * Used to start the global tick scheduler for live competitions.
 * 
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server, not during build or on edge
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startTickScheduler } = await import('./lib/tick-scheduler');
    startTickScheduler();
  }
}
