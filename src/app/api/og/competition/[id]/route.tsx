import { ImageResponse } from 'next/og';
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
      agents: { include: { agent: true }, orderBy: { score: 'desc' } },
      trades: { orderBy: { timestamp: 'desc' }, take: 3 },
    },
  });

  if (!comp) return new Response('Not found', { status: 404 });

  const [w, l] = comp.agents;
  const wPnl   = w ? `${w.pnlPct >= 0 ? '+' : ''}${w.pnlPct.toFixed(2)}%` : '—';
  const lPnl   = l ? `${l.pnlPct >= 0 ? '+' : ''}${l.pnlPct.toFixed(2)}%` : '—';
  const settled = comp.status === 'settled';

  const wColor = w?.agent?.color || '#66e3ff';
  const lColor = l?.agent?.color || '#a855f7';

  const maxAbs = Math.max(Math.abs(w?.pnlPct ?? 0), Math.abs(l?.pnlPct ?? 0), 1);
  const wBar = Math.max(10, Math.min(88, 50 + ((w?.pnlPct ?? 0) / maxAbs) * 38));
  const lBar = Math.max(10, Math.min(88, 50 + ((l?.pnlPct ?? 0) / maxAbs) * 38));

  const topTrades = comp.trades.slice(0, 2);

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'column',
        width: '1200px', height: '630px',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0d18 100%)',
        fontFamily: 'monospace', padding: '52px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '500px', height: '250px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, #66e3ff0c 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
          <span style={{ color: '#ffffff60', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            ⚡ Agent Arena · {settled ? 'Match Result' : comp.status.toUpperCase()}
          </span>
          <span style={{ marginLeft: 'auto', color: '#ffffff20', fontSize: '12px' }}>
            #{id.slice(0, 8)}
          </span>
        </div>

        {/* Head-to-head */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginBottom: '24px' }}>
          {/* Winner */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: wColor, display: 'flex', boxShadow: `0 0 10px ${wColor}` }} />
              <span style={{ color: '#ffffff70', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {settled ? '🏆 Winner' : 'Leading'}
              </span>
            </div>
            <span style={{ color: '#ffffff', fontSize: '38px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: '1' }}>
              {w?.agent?.name ?? '?'}
            </span>
            <span style={{ color: (w?.pnlPct ?? 0) >= 0 ? '#22c55e' : '#ef4444', fontSize: '30px', fontWeight: 700 }}>
              {wPnl}
            </span>
          </div>

          {/* VS */}
          <div style={{ display: 'flex', alignItems: 'center', paddingTop: '28px' }}>
            <span style={{ color: '#ffffff25', fontSize: '22px', fontWeight: 700 }}>VS</span>
          </div>

          {/* Loser */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#ffffff40', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {settled ? 'Defeated' : 'Trailing'}
              </span>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: lColor, display: 'flex' }} />
            </div>
            <span style={{ color: '#ffffff70', fontSize: '38px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: '1' }}>
              {l?.agent?.name ?? '?'}
            </span>
            <span style={{ color: (l?.pnlPct ?? 0) >= 0 ? '#22c55e' : '#ef4444', fontSize: '30px', fontWeight: 700 }}>
              {lPnl}
            </span>
          </div>
        </div>

        {/* Progress bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', height: '8px', background: '#ffffff0a', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${wBar}%`, background: wColor, borderRadius: '4px', display: 'flex' }} />
          </div>
          <div style={{ display: 'flex', height: '8px', background: '#ffffff0a', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${lBar}%`, background: lColor, borderRadius: '4px', display: 'flex' }} />
          </div>
        </div>

        {/* Top trades */}
        {topTrades.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
            <span style={{ color: '#ffffff30', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '2px' }}>
              Key Moves
            </span>
            {topTrades.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: '#ffffff05', borderRadius: '10px', padding: '10px 14px',
              }}>
                <span style={{
                  color: t.type === 'BUY' ? '#22c55e' : t.type === 'SELL' ? '#ef4444' : '#ffffff40',
                  fontSize: '11px', fontWeight: 700, minWidth: '32px',
                }}>
                  {t.type}
                </span>
                <span style={{ color: '#ffffff70', fontSize: '12px', minWidth: '72px' }}>{t.pair}</span>
                <span style={{ color: '#ffffff40', fontSize: '11px', flex: 1 }}>
                  {t.rationale.slice(0, 55)}{t.rationale.length > 55 ? '…' : ''}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <span style={{ color: '#ffffff30', fontSize: '13px' }}>Watch the replay →</span>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'linear-gradient(90deg, #66e3ff, #a855f7)',
            borderRadius: '100px', padding: '10px 24px',
            color: '#000', fontSize: '12px', fontWeight: 700,
          }}>
            agentarena.xyz/competitions/{id}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
