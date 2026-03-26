'use client';

import type { GameState } from '@/lib/game-engine';
import { getScoreDisplay } from '@/lib/game-engine';

interface SportScoreboardProps {
  gameState: GameState;
  agents: { id: string; name: string; color: string }[];
  isLive?: boolean;
}

export function SportScoreboard({ gameState, agents, isLive }: SportScoreboardProps) {
  const [a1, a2] = agents;
  if (!a1 || !a2) return null;

  const score = getScoreDisplay(gameState, [a1.id, a2.id]);
  const m1 = gameState.momentum[a1.id] ?? 50;
  const m2 = gameState.momentum[a2.id] ?? 50;

  // Max sets for this sport
  const maxSets = gameState.sport === 'table-tennis' ? 5 : 3;
  const setsToWin = gameState.sport === 'table-tennis' ? 3 : 2;

  return (
    <>
      <style>{`
        @keyframes scoreboard-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes live-breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
          50%       { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
        }
        @keyframes momentum-glow-green {
          0%, 100% { box-shadow: 0 0 4px #22c55e88; }
          50%       { box-shadow: 0 0 10px #22c55ecc; }
        }
        @keyframes momentum-glow-red {
          0%, 100% { box-shadow: 0 0 4px #ef444488; }
          50%       { box-shadow: 0 0 10px #ef4444cc; }
        }
      `}</style>

      <div
        className="relative overflow-hidden rounded-xl border border-white/10 select-none"
        style={{ background: 'var(--bg-card, #0d1829)' }}
      >
        {/* Gradient accent lines from each agent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, ${a1.color}18 0%, transparent 40%, transparent 60%, ${a2.color}18 100%)`,
          }}
        />

        <div className="relative px-4 py-3">
          {/* Top row: agent name | sets | sport label | sets | agent name */}
          <div className="flex items-center justify-between mb-2">
            {/* Agent 1 */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a1.color }} />
              <span
                className="text-sm font-bold truncate"
                style={{ color: a1.color }}
              >
                {a1.name}
                {gameState.winner === a1.id && ' 🏆'}
              </span>
            </div>

            {/* Center: sport + live + sets */}
            <div className="flex flex-col items-center gap-1 px-4 shrink-0">
              <div className="flex items-center gap-2">
                {isLive && (
                  <span
                    className="text-[10px] font-black tracking-widest text-emerald-400 px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(34,197,94,0.12)',
                      animation: 'live-breathe 2s ease-in-out infinite',
                    }}
                  >
                    ● LIVE
                  </span>
                )}
                {gameState.matchOver && (
                  <span className="text-[10px] font-black tracking-widest text-yellow-400 px-1.5 py-0.5 rounded" style={{ background: 'rgba(234,179,8,0.12)' }}>
                    FINAL
                  </span>
                )}
              </div>
              {/* Set dots */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: setsToWin }).map((_, i) => (
                  <div
                    key={`s1-${i}`}
                    className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{
                      background: i < score.setsWon.a1 ? a1.color : 'rgba(255,255,255,0.1)',
                      boxShadow: i < score.setsWon.a1 ? `0 0 6px ${a1.color}88` : 'none',
                    }}
                  />
                ))}
                <div className="w-1 h-1 rounded-full bg-white/20 mx-1" />
                {Array.from({ length: setsToWin }).map((_, i) => (
                  <div
                    key={`s2-${i}`}
                    className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{
                      background: i < score.setsWon.a2 ? a2.color : 'rgba(255,255,255,0.1)',
                      boxShadow: i < score.setsWon.a2 ? `0 0 6px ${a2.color}88` : 'none',
                    }}
                  />
                ))}
              </div>
              <span className="text-[9px] uppercase tracking-widest text-white/30">
                Set {gameState.currentSet + 1}
              </span>
            </div>

            {/* Agent 2 */}
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
              <span
                className="text-sm font-bold truncate"
                style={{ color: a2.color }}
              >
                {gameState.winner === a2.id && '🏆 '}
                {a2.name}
              </span>
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a2.color }} />
            </div>
          </div>

          {/* Score row */}
          <div className="flex items-center justify-between">
            <div
              className="text-5xl font-black tabular-nums leading-none"
              style={{ color: a1.color, textShadow: `0 0 20px ${a1.color}66` }}
            >
              {score.current.a1}
            </div>

            <div className="flex flex-col items-center gap-0.5 px-4">
              <span className="text-white/20 text-sm font-light">—</span>
              {score.sets.length > 1 && (
                <div className="flex flex-wrap gap-x-2 justify-center">
                  {score.sets.slice(0, gameState.currentSet).map((s, i) => (
                    <span key={i} className="text-[9px] text-white/30 font-mono">
                      {s.a1}–{s.a2}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div
              className="text-5xl font-black tabular-nums leading-none"
              style={{ color: a2.color, textShadow: `0 0 20px ${a2.color}66` }}
            >
              {score.current.a2}
            </div>
          </div>

          {/* Momentum bars */}
          <div className="mt-3 space-y-1">
            {[
              { agent: a1, m: m1 },
              { agent: a2, m: m2 },
            ].map(({ agent, m }) => {
              const barColor = m > 65 ? '#22c55e' : m < 35 ? '#ef4444' : agent.color;
              return (
                <div key={agent.id} className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-widest text-white/30 w-14 truncate shrink-0">
                    {agent.name}
                  </span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${m}%`,
                        background: barColor,
                        boxShadow: m > 65 ? `0 0 6px ${barColor}` : m < 35 ? `0 0 6px ${barColor}` : 'none',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-white/30 tabular-nums w-6 text-right">{Math.round(m)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
