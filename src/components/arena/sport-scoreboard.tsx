'use client';

import type { GameState } from '@/lib/game-engine';
import { getScoreDisplay } from '@/lib/game-engine';

interface SportScoreboardProps {
  gameState: GameState;
  agents:    { id: string; name: string; color: string }[];
  isLive?:   boolean;
}

export function SportScoreboard({ gameState, agents, isLive }: SportScoreboardProps) {
  const [a1, a2] = agents;
  if (!a1 || !a2) return null;

  const score     = getScoreDisplay(gameState, [a1.id, a2.id]);
  const m1        = gameState.momentum[a1.id] ?? 50;
  const m2        = gameState.momentum[a2.id] ?? 50;
  const setsToWin = 2; // badminton: first to 2 sets

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/10 select-none"
      style={{
        background: `linear-gradient(90deg, ${a1.color}18 0%, #0d1829 35%, #0d1829 65%, ${a2.color}18 100%)`,
        minHeight: 56,
      }}
    >
      {/* Gradient side accents */}
      <div className="absolute left-0 inset-y-0 w-0.5 rounded-l-xl" style={{ background: a1.color, opacity: 0.7 }} />
      <div className="absolute right-0 inset-y-0 w-0.5 rounded-r-xl" style={{ background: a2.color, opacity: 0.7 }} />

      {/* Top row: name | score | name */}
      <div className="relative flex items-center px-4 pt-3 pb-1">
        {/* Agent 1 */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a1.color, boxShadow: `0 0 6px ${a1.color}` }} />
          <span className="text-sm font-bold truncate" style={{ color: a1.color }}>
            {a1.name}{gameState.winner === a1.id && ' 🏆'}
          </span>
        </div>

        {/* Center: scores + set dots */}
        <div className="flex flex-col items-center gap-0.5 px-3 shrink-0">
          {/* LIVE / FINAL badge */}
          <div className="flex items-center gap-1.5 mb-0.5">
            {isLive ? (
              <span
                className="text-[9px] font-black tracking-widest text-emerald-400 px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(34,197,94,0.12)', animation: 'live-breathe 2s ease-in-out infinite' }}
              >
                ● LIVE
              </span>
            ) : gameState.matchOver ? (
              <span
                className="text-[9px] font-black tracking-widest text-yellow-400 px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(234,179,8,0.12)' }}
              >
                FINAL
              </span>
            ) : null}
            {gameState.rallyCount > 0 && (
              <span className="text-[9px] font-mono text-white/20">Rally #{gameState.rallyCount}</span>
            )}
          </div>

          {/* Scores */}
          <div className="flex items-center gap-2">
            <span
              className="text-4xl font-black tabular-nums leading-none"
              style={{ color: a1.color, textShadow: `0 0 16px ${a1.color}66` }}
            >
              {score.current.a1}
            </span>
            {/* Set dots between scores */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: setsToWin }).map((_, i) => (
                  <div
                    key={`d1-${i}`}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      background: i < score.setsWon.a1 ? a1.color : 'rgba(255,255,255,0.1)',
                      boxShadow: i < score.setsWon.a1 ? `0 0 4px ${a1.color}` : 'none',
                    }}
                  />
                ))}
              </div>
              <span className="text-white/20 text-xs">–</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: setsToWin }).map((_, i) => (
                  <div
                    key={`d2-${i}`}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      background: i < score.setsWon.a2 ? a2.color : 'rgba(255,255,255,0.1)',
                      boxShadow: i < score.setsWon.a2 ? `0 0 4px ${a2.color}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
            <span
              className="text-4xl font-black tabular-nums leading-none"
              style={{ color: a2.color, textShadow: `0 0 16px ${a2.color}66` }}
            >
              {score.current.a2}
            </span>
          </div>

          {/* Previous sets */}
          {score.sets.length > 1 && (
            <div className="flex gap-2 mt-0.5">
              {score.sets.slice(0, gameState.currentSet).map((s, i) => (
                <span key={i} className="text-[9px] text-white/25 font-mono">{s.a1}–{s.a2}</span>
              ))}
            </div>
          )}
        </div>

        {/* Agent 2 */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <span className="text-sm font-bold truncate" style={{ color: a2.color }}>
            {gameState.winner === a2.id && '🏆 '}{a2.name}
          </span>
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a2.color, boxShadow: `0 0 6px ${a2.color}` }} />
        </div>
      </div>

      {/* Momentum bars meeting in center */}
      <div className="px-4 pb-3 mt-1">
        <div className="flex h-1.5 overflow-hidden rounded-full bg-white/5">
          {/* Left agent fills from left */}
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${m1 / 2}%`,
              background: m1 > 65 ? '#22c55e' : m1 < 35 ? '#ef4444' : a1.color,
              boxShadow: `0 0 4px ${a1.color}66`,
            }}
          />
          <div className="flex-1" />
          {/* Right agent fills from right */}
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${m2 / 2}%`,
              background: m2 > 65 ? '#22c55e' : m2 < 35 ? '#ef4444' : a2.color,
              boxShadow: `0 0 4px ${a2.color}66`,
            }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[8px] font-mono text-white/20">{Math.round(m1)}</span>
          <span className="text-[8px] uppercase tracking-widest text-white/20">momentum</span>
          <span className="text-[8px] font-mono text-white/20">{Math.round(m2)}</span>
        </div>
      </div>
    </div>
  );
}
