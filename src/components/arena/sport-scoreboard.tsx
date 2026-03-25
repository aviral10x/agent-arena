'use client';

import type { GameState } from '@/lib/game-engine';
import { getScoreDisplay } from '@/lib/game-engine';

interface SportScoreboardProps {
  gameState: GameState;
  agents: { id: string; name: string; color: string }[];
}

const SPORT_LABELS: Record<string, string> = {
  badminton:     '🏸 Badminton',
  tennis:        '🎾 Tennis',
  'table-tennis': '🏓 Table Tennis',
};

export function SportScoreboard({ gameState, agents }: SportScoreboardProps) {
  const [a1, a2] = agents;
  if (!a1 || !a2) return null;

  const score = getScoreDisplay(gameState, [a1.id, a2.id]);

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4 font-mono select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-white/50 uppercase tracking-wider">
          {SPORT_LABELS[gameState.sport] ?? gameState.sport}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Set {gameState.currentSet + 1}</span>
          {gameState.matchOver && (
            <span className="text-xs font-bold text-yellow-400 animate-pulse px-2 py-0.5 bg-yellow-400/10 rounded">
              MATCH OVER
            </span>
          )}
        </div>
      </div>

      {/* Score row */}
      <div className="flex items-center gap-3">
        {/* Agent 1 */}
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-semibold truncate mb-1"
            style={{ color: a1.color }}
          >
            {a1.name}
            {gameState.winner === a1.id && ' 🏆'}
          </div>
          <div
            className="text-5xl font-black tabular-nums leading-none"
            style={{ color: a1.color }}
          >
            {score.current.a1}
          </div>
        </div>

        {/* Centre divider */}
        <div className="flex flex-col items-center gap-1.5 px-2 shrink-0">
          <span className="text-white/20 text-xs">vs</span>
          {/* Sets won dots */}
          <div className="flex gap-1">
            {Array.from({ length: score.setsWon.a1 }).map((_, i) => (
              <div key={`a1-${i}`} className="w-2 h-2 rounded-full" style={{ background: a1.color }} />
            ))}
            {Array.from({ length: score.setsWon.a2 }).map((_, i) => (
              <div key={`a2-${i}`} className="w-2 h-2 rounded-full" style={{ background: a2.color }} />
            ))}
            {score.setsWon.a1 === 0 && score.setsWon.a2 === 0 && (
              <div className="w-2 h-2 rounded-full bg-white/10" />
            )}
          </div>
          <span className="text-white/20 text-xs">sets</span>
        </div>

        {/* Agent 2 */}
        <div className="flex-1 min-w-0 text-right">
          <div
            className="text-sm font-semibold truncate mb-1"
            style={{ color: a2.color }}
          >
            {gameState.winner === a2.id && '🏆 '}
            {a2.name}
          </div>
          <div
            className="text-5xl font-black tabular-nums leading-none"
            style={{ color: a2.color }}
          >
            {score.current.a2}
          </div>
        </div>
      </div>

      {/* Set history */}
      {score.sets.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 justify-center">
          {score.sets.slice(0, gameState.currentSet).map((s, i) => (
            <span key={i} className="text-xs text-white/40">
              S{i + 1}:&nbsp;
              <span style={{ color: a1.color }}>{s.a1}</span>
              {' – '}
              <span style={{ color: a2.color }}>{s.a2}</span>
            </span>
          ))}
        </div>
      )}

      {/* Momentum bars */}
      <div className="mt-4 space-y-2">
        {[a1, a2].map(a => {
          const m = gameState.momentum[a.id] ?? 50;
          const barColor = m > 65 ? '#22c55e' : m < 35 ? '#ef4444' : a.color;
          return (
            <div key={a.id} className="flex items-center gap-2">
              <span
                className="text-xs truncate w-16 shrink-0"
                style={{ color: a.color }}
              >
                {a.name}
              </span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${m}%`, background: barColor }}
                />
              </div>
              <span className="text-xs text-white/30 w-8 text-right tabular-nums">
                {m.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="mt-3 flex items-center justify-between text-xs text-white/30">
        <span>Rally #{gameState.rallyCount}</span>
        <span className="font-medium text-white/40">{gameState.lastAction}</span>
        <span>Rally len: {gameState.rallyLength}</span>
      </div>
    </div>
  );
}
