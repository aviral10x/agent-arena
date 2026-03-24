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

  const winRate     = stats ? `${(stats.winRate * 100).toFixed(0)}%`  : '—';
  const totalPnl    = stats ? `${stats.totalPnlPct >= 0 ? '+' : ''}${stats.totalPnlPct.toFixed(1)}%` : '—';
  const wins        = stats?.totalWins        ?? 0;
  const losses      = stats?.totalLosses      ?? 0;
  const bestWin     = stats ? `+${stats.bestWinPct.toFixed(1)}%` : '—';
  const recentDots  = (card?.recentResults ?? '').split(',').filter(Boolean).slice(0, 5);

  const color  = agent.color  || '#66e3ff';
  const accent = card?.accentColor || color;

  // Gradient background
  const bg = card?.bgGradient || `linear-gradient(135deg, #0a0a0f 0%, #12121a 100%)`;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '1200px',
          height: '630px',
          background: bg,
          fontFamily: 'monospace',
          padding: '56px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow blob */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
          display: 'flex',
        }} />

        {/* Top bar: Arena branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{
            background: accent,
            borderRadius: '8px',
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>⚡</div>
          <span style={{ color: '#ffffff60', fontSize: '14px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Agent Arena
          </span>
          <span style={{ color: '#ffffff20', marginLeft: 'auto', fontSize: '13px' }}>
            agentarena.xyz
          </span>
        </div>

        {/* Agent name + archetype */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            {/* Color dot */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: accent,
              display: 'flex',
              boxShadow: `0 0 32px ${accent}80`,
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#ffffff', fontSize: '52px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {agent.name}
              </span>
              <span style={{ color: accent, fontSize: '18px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {agent.archetype}
              </span>
            </div>
          </div>
          {card?.tagline && (
            <span style={{ color: '#ffffff60', fontSize: '20px', marginLeft: '64px' }}>
              "{card.tagline}"
            </span>
          )}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: '16px', marginBottom: '32px',
        }}>
          {[
            { label: 'Win Rate',  value: winRate },
            { label: 'Total PnL', value: totalPnl },
            { label: 'Best Win',  value: bestWin },
            { label: 'W / L',     value: `${wins} / ${losses}` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              flex: 1,
              background: '#ffffff08',
              border: '1px solid #ffffff15',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <span style={{ color: '#ffffff40', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                {label}
              </span>
              <span style={{ color: '#ffffff', fontSize: '28px', fontWeight: 700 }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Recent results dots + streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <span style={{ color: '#ffffff40', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Recent
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {recentDots.length > 0 ? recentDots.map((r, i) => (
              <div key={i} style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: r === 'W' ? '#22c55e' : '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', color: '#fff', fontWeight: 700,
              }}>
                {r}
              </div>
            )) : (
              <span style={{ color: '#ffffff30', fontSize: '14px' }}>No results yet</span>
            )}
          </div>
          {stats && stats.currentStreak !== 0 && (
            <span style={{
              marginLeft: 'auto',
              color: stats.currentStreak > 0 ? '#22c55e' : '#ef4444',
              fontSize: '16px', fontWeight: 700,
            }}>
              {stats.currentStreak > 0 ? `🔥 ${stats.currentStreak}-win streak` : `${Math.abs(stats.currentStreak)}-loss run`}
            </span>
          )}
        </div>

        {/* CTA */}
        <div style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ color: '#ffffff30', fontSize: '14px' }}>
            Challenge this agent →
          </span>
          <div style={{
            background: accent,
            borderRadius: '100px',
            padding: '10px 24px',
            color: '#000',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}>
            agentarena.xyz/agents/{id}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
