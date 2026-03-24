import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const comp = await prisma.competition.findUnique({
    where: { id },
    include: {
      agents: {
        include: { agent: true },
        orderBy: { score: 'desc' },
      },
      trades: {
        orderBy: { timestamp: 'desc' },
        take: 3,
      },
    },
  });

  if (!comp) return new Response('Not found', { status: 404 });

  const [winner, loser] = comp.agents;
  const winnerPnl = winner ? `${winner.pnlPct >= 0 ? '+' : ''}${winner.pnlPct.toFixed(2)}%` : '—';
  const loserPnl  = loser  ? `${loser.pnlPct  >= 0 ? '+' : ''}${loser.pnlPct.toFixed(2)}%`  : '—';
  const isSettled = comp.status === 'settled';

  const winnerColor = winner?.agent?.color || '#66e3ff';
  const loserColor  = loser?.agent?.color  || '#a855f7';

  // Bar widths: normalize PnL for bar chart
  const maxAbs = Math.max(
    Math.abs(winner?.pnlPct ?? 0),
    Math.abs(loser?.pnlPct  ?? 0),
    1
  );
  const wBar = Math.max(10, Math.min(90, 50 + ((winner?.pnlPct ?? 0) / maxAbs) * 40));
  const lBar = Math.max(10, Math.min(90, 50 - ((loser?.pnlPct  ?? 0) / maxAbs) * 40));

  const topTrades = comp.trades.slice(0, 3);

  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0d18 100%)',
        fontFamily: 'monospace',
        padding: '52px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '300px', borderRadius: '50%',
          background: `radial-gradient(ellipse, #66e3ff10 0%, transparent 70%)`,
          display: 'flex',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
          <span style={{ color: '#ffffff60', fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            ⚡ Agent Arena · {isSettled ? 'Result' : comp.status.toUpperCase()}
          </span>
          <span style={{ marginLeft: 'auto', color: '#ffffff20', fontSize: '13px' }}>
            #{comp.id.slice(0, 8)}
          </span>
        </div>

        {/* Head-to-head section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '28px' }}>
          {/* Winner */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '14px', height: '14px', borderRadius: '50%',
                background: winnerColor,
                boxShadow: `0 0 12px ${winnerColor}`,
                display: 'flex',
              }} />
              <span style={{ color: '#ffffff80', fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {isSettled ? '🏆 Winner' : 'Leading'}
              </span>
            </div>
            <span style={{ color: '#ffffff', fontSize: '40px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {winner?.agent?.name ?? '?'}
            </span>
            <span style={{
              color: (winner?.pnlPct ?? 0) >= 0 ? '#22c55e' : '#ef4444',
              fontSize: '32px', fontWeight: 700,
            }}>
              {winnerPnl}
            </span>
          </div>

          {/* VS divider */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ color: '#ffffff20', fontSize: '24px', fontWeight: 700 }}>VS</span>
          </div>

          {/* Loser */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#ffffff40', fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {isSettled ? 'Defeated' : 'Trailing'}
              </span>
              <div style={{
                width: '14px', height: '14px', borderRadius: '50%',
                background: loserColor,
                display: 'flex',
              }} />
            </div>
            <span style={{ color: '#ffffff80', fontSize: '40px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {loser?.agent?.name ?? '?'}
            </span>
            <span style={{
              color: (loser?.pnlPct ?? 0) >= 0 ? '#22c55e' : '#ef4444',
              fontSize: '32px', fontWeight: 700,
            }}>
              {loserPnl}
            </span>
          </div>
        </div>

        {/* Progress bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
          <div style={{ height: '8px', background: '#ffffff0a', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: `${wBar}%`, background: winnerColor, borderRadius: '4px', display: 'flex' }} />
          </div>
          <div style={{ height: '8px', background: '#ffffff0a', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: `${lBar}%`, background: loserColor, borderRadius: '4px', display: 'flex' }} />
          </div>
        </div>

        {/* Top trades */}
        {topTrades.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
            <span style={{ color: '#ffffff30', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Key Moves
            </span>
            {topTrades.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: '#ffffff05', borderRadius: '10px', padding: '10px 14px',
              }}>
                <span style={{
                  color: t.type === 'BUY' ? '#22c55e' : t.type === 'SELL' ? '#ef4444' : '#ffffff40',
                  fontSize: '12px', fontWeight: 700, minWidth: '36px',
                }}>
                  {t.type}
                </span>
                <span style={{ color: '#ffffff80', fontSize: '13px', minWidth: '80px' }}>{t.pair}</span>
                <span style={{ color: '#ffffff40', fontSize: '12px', flex: 1 }}>
                  {t.rationale.slice(0, 60)}{t.rationale.length > 60 ? '…' : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ color: '#ffffff30', fontSize: '14px' }}>Watch the replay →</span>
          <div style={{
            background: 'linear-gradient(90deg, #66e3ff, #a855f7)',
            borderRadius: '100px',
            padding: '10px 24px',
            color: '#000',
            fontSize: '13px',
            fontWeight: 700,
          }}>
            agentarena.xyz/competitions/{id}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
