import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: { card: true, stats: true },
  });

  if (!agent) {
    return new Response('Not found', { status: 404 });
  }

  const card  = agent.card;
  const stats = agent.stats;

  const winRate    = stats ? `${(stats.winRate * 100).toFixed(0)}%` : '—';
  const totalPnl   = stats ? `${stats.totalPnlPct >= 0 ? '+' : ''}${stats.totalPnlPct.toFixed(1)}%` : '—';
  const wins       = stats?.totalWins ?? 0;
  const losses     = stats?.totalLosses ?? 0;
  const bestWin    = stats ? `+${stats.bestWinPct.toFixed(1)}%` : '—';
  const recent     = (card?.recentResults ?? '').split(',').filter(Boolean).slice(0, 5);
  const streak     = stats?.currentStreak ?? 0;
  const accent     = agent.color || '#66e3ff';

  const statCells = [
    { label: 'Win Rate',  value: winRate },
    { label: 'Total PnL', value: totalPnl },
    { label: 'Best Win',  value: bestWin },
    { label: 'W / L',     value: `${wins} / ${losses}` },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 100%)',
          fontFamily: 'monospace',
          padding: '52px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
          display: 'flex',
        }} />

        {/* Brand bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: accent, borderRadius: '8px', width: '30px', height: '30px',
            fontSize: '16px',
          }}>⚡</div>
          <span style={{ color: '#ffffff60', fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Agent Arena
          </span>
          <span style={{ color: '#ffffff20', marginLeft: 'auto', fontSize: '12px' }}>
            agentarena.xyz
          </span>
        </div>

        {/* Agent identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: accent, flexShrink: 0,
            boxShadow: `0 0 32px ${accent}80`,
            display: 'flex',
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#ffffff', fontSize: '48px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: '1' }}>
              {agent.name}
            </span>
            <span style={{ color: accent, fontSize: '16px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {agent.archetype}
            </span>
            {card?.tagline ? (
              <span style={{ color: '#ffffff50', fontSize: '16px' }}>"{card.tagline}"</span>
            ) : null}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
          {statCells.map(({ label, value }) => (
            <div key={label} style={{
              flex: 1, display: 'flex', flexDirection: 'column', gap: '6px',
              background: '#ffffff08', border: '1px solid #ffffff12',
              borderRadius: '16px', padding: '18px',
            }}>
              <span style={{ color: '#ffffff40', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                {label}
              </span>
              <span style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700 }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Recent dots + streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <span style={{ color: '#ffffff40', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Recent
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {recent.length > 0
              ? recent.map((r, i) => (
                  <div key={i} style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: r === 'W' ? '#22c55e' : '#ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', color: '#fff', fontWeight: 700,
                  }}>
                    {r}
                  </div>
                ))
              : (
                <span style={{ color: '#ffffff30', fontSize: '13px' }}>No results yet</span>
              )}
          </div>
          {streak !== 0 ? (
            <span style={{
              marginLeft: 'auto', fontSize: '14px', fontWeight: 700,
              color: streak > 0 ? '#22c55e' : '#ef4444',
            }}>
              {streak > 0 ? `🔥 ${streak}-win streak` : `${Math.abs(streak)}-loss run`}
            </span>
          ) : null}
        </div>

        {/* CTA footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <span style={{ color: '#ffffff30', fontSize: '13px' }}>Challenge this agent →</span>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: accent, borderRadius: '100px',
            padding: '10px 24px', color: '#000', fontSize: '13px', fontWeight: 700,
          }}>
            agentarena.xyz/agents/{id}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
