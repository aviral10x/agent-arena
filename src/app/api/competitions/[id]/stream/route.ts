import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// SSE: push competition state + recent trades every time something changes.
// Client connects once; server polls DB and pushes diffs.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastTradeId = '';
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { closed = true; }
      };

      const push = async () => {
        if (closed) return;
        try {
          const [comp, trades] = await Promise.all([
            prisma.competition.findUnique({
              where: { id },
              include: {
                agents: { include: { agent: true }, orderBy: { score: 'desc' } },
              },
            }),
            prisma.trade.findMany({
              where: { competitionId: id },
              include: { agent: true },
              orderBy: { timestamp: 'desc' },
              take: 20,
            }),
          ]);

          if (!comp) { send('error', { message: 'Not found' }); closed = true; return; }

          // Leaderboard snapshot
          send('leaderboard', {
            status: comp.status,
            agents: comp.agents.map((ca: any) => ({
              id:        ca.agent.id,
              name:      ca.agent.name,
              color:     ca.agent.color,
              archetype: ca.agent.archetype,
              portfolio: ca.portfolio,
              pnl:       ca.pnl,
              pnlPct:    ca.pnlPct,
              trades:    ca.trades,
              score:     ca.score,
            })),
          });

          // Only push new trades since last check
          const newestId = trades[0]?.id ?? '';
          if (newestId !== lastTradeId) {
            lastTradeId = newestId;
            send('trades', trades.map((t: any) => ({
              id:          t.id,
              type:        t.type,
              agentId:     t.agentId,
              agentName:   t.agent?.name ?? t.agentId,
              pair:        t.pair,
              amount:      t.amount,
              rationale:   t.rationale,
              priceImpact: t.priceImpact,
              timestamp:   t.timestamp,
            })));
          }

          // Stop streaming when settled
          if (comp.status === 'settled') {
            send('settled', { winnerId: comp.winnerId });
            closed = true;
            controller.close();
          }
        } catch (err) {
          console.error('[SSE] stream error:', err);
        }
      };

      // Initial push immediately, then every 5s
      await push();
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return; }
        await push();
      }, 5000);

      // Keep-alive heartbeat every 20s
      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        try { controller.enqueue(encoder.encode(': ping\n\n')); } catch { closed = true; }
      }, 20_000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
