'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { SportScoreboard } from './sport-scoreboard';
import { BettingPanelClient } from './betting-panel-client';
import type { GameState } from '@/lib/game-engine';

import { CourtCanvas } from './court-canvas';

const TrainerConsole = dynamic(
  () => import('./trainer-console').then(m => ({ default: m.TrainerConsole })),
  { ssr: false }
);

interface Agent {
  id:    string;
  name:  string;
  color: string;
  owner: string;
}

interface TradeEvent {
  id:          string;
  type:        string;
  agentId:     string;
  pair:        string;
  rationale:   string;
  timestamp:   string;
}

interface SportMatchClientProps {
  competitionId: string;
  initialGameState: string | null; // JSON string
  agents:    Agent[];
  status:    string;
  sport:     string;
  tradeFeed: TradeEvent[];
  bettingOpen:   boolean;
  totalBetUsdc:  number;
  winnerId:      string | null;
}

const ACTION_COLORS: Record<string, string> = {
  SMASH:   'text-red-400',
  DROP:    'text-purple-400',
  CLEAR:   'text-blue-400',
  DRIVE:   'text-amber-400',
  LOB:     'text-emerald-400',
  BLOCK:   'text-gray-400',
  SERVE:   'text-white',
  SPECIAL: 'text-yellow-400',
};

const ACTION_ICONS: Record<string, string> = {
  SMASH:   '💥',
  DROP:    '🎯',
  CLEAR:   '↩️',
  DRIVE:   '⚡',
  LOB:     '🌙',
  BLOCK:   '🛡️',
  SERVE:   '🏸',
  SPECIAL: '✨',
};

export function SportMatchClient({
  competitionId,
  initialGameState,
  agents,
  status,
  sport,
  tradeFeed: initialTrades,
  bettingOpen,
  totalBetUsdc,
  winnerId,
}: SportMatchClientProps) {
  const [gameState, setGameState] = useState<GameState | null>(() => {
    try { return initialGameState ? JSON.parse(initialGameState) : null; } catch { return null; }
  });
  const [events, setEvents] = useState<TradeEvent[]>(initialTrades);
  const [isLive, setIsLive] = useState(status === 'live');

  // SSE — subscribe to live game state updates
  useEffect(() => {
    if (status !== 'live') return;

    const es = new EventSource(`/api/competitions/${competitionId}/stream`);

    es.addEventListener('leaderboard', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.gameState) {
          setGameState(typeof data.gameState === 'string'
            ? JSON.parse(data.gameState)
            : data.gameState
          );
        }
        if (data.status && data.status !== 'live') setIsLive(false);
      } catch {}
    });

    es.onerror = () => {
      // SSE reconnects automatically
    };

    return () => es.close();
  }, [competitionId, status]);

  // Poll for new events (rally-by-rally feed)
  useEffect(() => {
    if (status !== 'live') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/competitions/${competitionId}/trades`);
        if (res.ok) {
          const trades = await res.json();
          setEvents(trades);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [competitionId, status]);

  const agentNames  = Object.fromEntries(agents.map(a => [a.id, a.name]));
  const agentColors = Object.fromEntries(agents.map(a => [a.id, a.color]));

  const getAgentName = (id: string) => agents.find(a => a.id === id)?.name ?? id;
  const getAgentColor = (id: string) => agents.find(a => a.id === id)?.color ?? '#888';

  const SPORT_LABELS: Record<string, string> = {
    badminton:     '🏸 Badminton',
    tennis:        '🎾 Tennis',
    'table-tennis': '🏓 Table Tennis',
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
      {/* Sport banner */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-semibold text-white/60">
          {SPORT_LABELS[sport] ?? sport}
        </span>
        {isLive && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        )}
        {!isLive && status === 'settled' && winnerId && (
          <span className="text-xs text-yellow-400">
            🏆 {getAgentName(winnerId)} wins!
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px_300px]">

        {/* ── COL 1: Scoreboard + Court Canvas + Trainer Consoles ── */}
        <div className="flex flex-col gap-4">

          {/* Scoreboard */}
          {gameState ? (
            <SportScoreboard gameState={gameState} agents={agents} />
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-white/40 text-sm">
                {status === 'live'
                  ? 'Match starting… first tick coming up.'
                  : 'Match has not started yet.'}
              </p>
            </div>
          )}

          {/* Trainer consoles (wallet-gated per agent) */}
          {status === 'live' && agents.map(a => (
            <TrainerConsole
              key={a.id}
              competitionId={competitionId}
              agentId={a.id}
              agentName={a.name}
              agentOwner={a.owner}
            />
          ))}
        </div>

        {/* ── COL 2: Court Canvas ── */}
        <div className="flex flex-col gap-4 items-center">
          {gameState ? (
            <CourtCanvas
              gameState={gameState}
              agentNames={agentNames}
              agentColors={agentColors}
              className="w-full"
            />
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 w-full aspect-[4/5] flex items-center justify-center">
              <span className="text-white/30 text-sm">Court loading…</span>
            </div>
          )}

          {/* Rally counter */}
          {gameState && (
            <div className="text-center text-xs text-white/30 font-mono">
              Total rallies: {gameState.rallyCount}
            </div>
          )}
        </div>

        {/* ── COL 3: Betting + Event Feed ── */}
        <div className="flex flex-col gap-4">

          {/* Betting panel (unchanged — works for any competition type) */}
          <BettingPanelClient
            competitionId={competitionId}
            agents={agents.map(a => ({
              id: a.id, name: a.name, color: a.color, ownerWallet: a.owner,
            }))}
            bettingOpen={bettingOpen}
            totalBetUsdc={totalBetUsdc}
            winnerId={winnerId}
            status={status}
          />

          {/* Rally / event feed */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2 max-h-[480px] overflow-y-auto">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">
              Rally Feed
            </div>
            {events.length === 0 && (
              <p className="text-white/30 text-xs">No events yet — match starting soon.</p>
            )}
            {events.map(ev => {
              const color = getAgentColor(ev.agentId);
              const icon  = ACTION_ICONS[ev.type] ?? '•';
              const cls   = ACTION_COLORS[ev.type] ?? 'text-white';
              return (
                <div key={ev.id} className="flex gap-2 text-xs">
                  <span className="text-white/20 shrink-0 tabular-nums">
                    {new Date(ev.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="shrink-0">{icon}</span>
                  <span>
                    <span className="font-semibold" style={{ color }}>{getAgentName(ev.agentId)}</span>
                    {' '}
                    <span className={cls}>{ev.type}</span>
                    {' '}
                    <span className="text-white/50">{ev.pair?.slice(0, 60)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
