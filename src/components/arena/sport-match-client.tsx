'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { SportScoreboard } from './sport-scoreboard';
import { BettingPanelClient } from './betting-panel-client';
import { CourtCanvas } from './court-canvas';
import type { GameState } from '@/lib/game-engine';
import { getScoreDisplay } from '@/lib/game-engine';

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
  id:        string;
  type:      string;
  agentId:   string;
  pair:      string;
  rationale: string;
  timestamp: string;
}

interface SportMatchClientProps {
  competitionId:    string;
  initialGameState: string | null;
  agents:           Agent[];
  status:           string;
  sport:            string;
  tradeFeed:        TradeEvent[];
  bettingOpen:      boolean;
  totalBetUsdc:     number;
  winnerId:         string | null;
}

const ACTION_EMOJI: Record<string, string> = {
  SMASH:   '💥',
  DROP:    '🎯',
  CLEAR:   '↩️',
  DRIVE:   '⚡',
  LOB:     '🌙',
  BLOCK:   '🛡️',
  SERVE:   '🏸',
  SPECIAL: '✨',
  POINT:   '🔥',
};

const ACTION_COLORS: Record<string, string> = {
  SMASH:   '#f87171',
  DROP:    '#c084fc',
  CLEAR:   '#60a5fa',
  DRIVE:   '#fbbf24',
  LOB:     '#34d399',
  BLOCK:   '#9ca3af',
  SERVE:   '#f1f5f9',
  SPECIAL: '#facc15',
  POINT:   '#fbbf24',
};

const SPORT_LABELS: Record<string, string> = {
  badminton:      '🏸 Badminton',
  tennis:         '🎾 Tennis',
  'table-tennis': '🏓 Table Tennis',
};

// ── Agent Duel Card ───────────────────────────────────────────────────────────
function AgentDuelCard({
  agent,
  oppAgent,
  gameState,
  isWinner,
  agentStats,
}: {
  agent:      Agent;
  oppAgent:   Agent | undefined;
  gameState:  GameState | null;
  isWinner:   boolean;
  agentStats: Record<string, any>;
}) {
  const momentum   = gameState?.momentum[agent.id] ?? 50;
  const oppMomentum = gameState?.momentum[oppAgent?.id ?? ''] ?? 50;

  // SVG ring
  const circumference = 2 * Math.PI * 40; // 251.2
  const dasharray = `${(momentum * circumference / 100).toFixed(1)} ${circumference.toFixed(1)}`;
  const ringColor = momentum > 65 ? '#22c55e' : momentum < 35 ? '#ef4444' : agent.color;

  // Score-based win prob
  const currentSetScores = gameState?.sets?.[gameState.currentSet]?.agentScores ?? {};
  const score    = currentSetScores[agent.id] ?? 0;
  const oppScore = currentSetScores[oppAgent?.id ?? ''] ?? 0;
  const scoreRatio = score / Math.max(1, score + oppScore);
  const winProb = Math.min(97, Math.max(3, Math.round(momentum * 0.35 + scoreRatio * 65)));

  // Stats from API or derived from color
  const stats = agentStats[agent.id];
  const hasStats = !!stats;

  // Archetype
  const archetype = stats?.archetype ?? agent.name.split(' ')[0];

  // Special moves (API returns JSON string or array)
  const specialMoves: string[] = (() => {
    const raw = stats?.specialMoves;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  })();

  return (
    <div
      className="relative overflow-hidden rounded-xl border p-4 flex flex-col gap-3 transition-all duration-300"
      style={{
        borderColor: `${agent.color}33`,
        background: `linear-gradient(135deg, ${agent.color}0d 0%, #0d1829 60%)`,
        animation: isWinner ? 'winner-entrance 0.6s ease-out' : undefined,
      }}
    >
      {isWinner && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: `inset 0 0 24px ${agent.color}44`, border: `1px solid ${agent.color}88` }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ background: agent.color, boxShadow: `0 0 8px ${agent.color}` }}
          />
          <span className="text-sm font-bold truncate" style={{ color: agent.color }}>
            {agent.name}
          </span>
          {isWinner && <span className="text-yellow-400 text-sm">🏆</span>}
        </div>
        {archetype && (
          <span
            className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded shrink-0"
            style={{ background: `${agent.color}22`, color: agent.color }}
          >
            {archetype.toUpperCase()}
          </span>
        )}
      </div>

      {/* Momentum ring + win prob */}
      <div className="flex items-center gap-3">
        {/* SVG ring */}
        <div className="relative shrink-0" style={{ width: 88, height: 88 }}>
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle
              cx="44" cy="44" r="40"
              fill="none"
              stroke={ringColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={dasharray}
              transform="rotate(-90 44 44)"
              style={{
                transition: 'stroke-dasharray 0.7s ease, stroke 0.7s ease',
                filter: `drop-shadow(0 0 6px ${ringColor})`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-black tabular-nums" style={{ color: ringColor }}>
              {Math.round(momentum)}
            </span>
            <span className="text-[8px] uppercase tracking-widest text-white/30">mo</span>
          </div>
        </div>

        {/* Win prob */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-white/30">Win Prob</span>
            <div
              className="text-2xl font-black tabular-nums"
              style={{ color: winProb > 60 ? '#22c55e' : winProb < 40 ? '#ef4444' : 'white' }}
            >
              {winProb}%
            </div>
          </div>
        </div>
      </div>

      {/* Stat bars */}
      <div className="space-y-1.5">
        {(hasStats
          ? [
              ['SPD', stats.speed ?? 5, agent.color] as [string, number, string],
              ['PWR', stats.power ?? 5, '#f87171'] as [string, number, string],
              ['STA', stats.stamina ?? 5, '#34d399'] as [string, number, string],
              ['ACC', stats.accuracy ?? 5, '#c084fc'] as [string, number, string],
            ]
          : [
              ['SPD', null, agent.color] as [string, null, string],
              ['PWR', null, '#f87171'] as [string, null, string],
              ['STA', null, '#34d399'] as [string, null, string],
              ['ACC', null, '#c084fc'] as [string, null, string],
            ]
        ).map(([label, val, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest text-white/30 w-7 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {val !== null ? (
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(val as number) * 10}%`, background: color as string, boxShadow: `0 0 4px ${color as string}66` }}
                />
              ) : (
                <div className="h-full rounded-full bg-white/10 animate-pulse" style={{ width: '60%' }} />
              )}
            </div>
            {val !== null
              ? <span className="text-[9px] text-white/30 tabular-nums w-4 text-right">{val}</span>
              : <span className="text-[9px] text-white/20 w-4 text-right">—</span>
            }
          </div>
        ))}
      </div>

      {/* Special moves */}
      {specialMoves.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {specialMoves.slice(0, 3).map((move: string) => (
            <span
              key={move}
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,212,170,0.12)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.2)' }}
            >
              {move}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Play-by-Play Feed Item ────────────────────────────────────────────────────
function FeedItem({
  ev,
  getAgentName,
  getAgentColor,
}: {
  ev:            TradeEvent;
  getAgentName:  (id: string) => string;
  getAgentColor: (id: string) => string;
}) {
  const emoji      = ACTION_EMOJI[ev.type] ?? '•';
  const color      = ACTION_COLORS[ev.type] ?? 'rgba(255,255,255,0.7)';
  const agentColor = getAgentColor(ev.agentId);
  const agentName  = getAgentName(ev.agentId);
  const isPoint    = ev.type === 'POINT'
    || ev.pair?.toLowerCase().includes('point')
    || ev.rationale?.includes('POINT')
    || ev.rationale?.includes('WINNER')
    || ev.rationale?.includes('UNRETURNABLE');

  return (
    <div
      key={ev.id}
      className="flex gap-2 items-start px-3 py-2 transition-all"
      style={{
        animation: 'slide-in-left 0.3s ease-out',
        background: isPoint ? 'rgba(250,204,21,0.06)' : 'transparent',
        borderLeft: `2px solid ${agentColor}44`,
      }}
    >
      <span className="text-sm shrink-0 leading-none mt-0.5">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold" style={{ color: agentColor }}>{agentName}</span>
          <span className="text-xs font-mono font-semibold" style={{ color }}>{ev.type}</span>
          {isPoint && (
            <span
              className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(250,204,21,0.2)', color: '#fbbf24' }}
            >
              POINT ⚡
            </span>
          )}
        </div>
        {ev.rationale && (
          <p className="text-[10px] font-mono text-white/30 truncate mt-0.5">
            {ev.rationale.slice(0, 80)}
          </p>
        )}
      </div>
      <span className="text-[9px] text-white/20 shrink-0 tabular-nums mt-0.5">
        {new Date(ev.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
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
  const [mounted, setMounted]   = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(() => {
    try { return initialGameState ? JSON.parse(initialGameState) : null; } catch { return null; }
  });
  const [events, setEvents]     = useState<TradeEvent[]>(initialTrades);
  const [isLive, setIsLive]     = useState(status === 'live');
  const [agentStats, setAgentStats] = useState<Record<string, any>>({});

  useEffect(() => { setMounted(true); }, []);

  const agentNames  = Object.fromEntries(agents.map(a => [a.id, a.name]));
  const agentColors = Object.fromEntries(agents.map(a => [a.id, a.color]));

  const getAgentName  = (id: string) => agents.find(a => a.id === id)?.name ?? id;
  const getAgentColor = (id: string) => agents.find(a => a.id === id)?.color ?? '#888';

  const [a1, a2] = agents;

  // Fetch agent stats client-side
  useEffect(() => {
    agents.forEach(a => {
      fetch(`/api/agents/${a.id}`)
        .then(r => r.json())
        .then(data => setAgentStats(prev => ({ ...prev, [a.id]: data })))
        .catch(() => {});
    });
  }, [agents]);

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
      } catch { /* ignore */ }
    });
    es.onerror = () => {};
    return () => es.close();
  }, [competitionId, status]);

  // Poll for new events
  useEffect(() => {
    if (status !== 'live') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/competitions/${competitionId}/trades`);
        if (res.ok) setEvents(await res.json());
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [competitionId, status]);

  const score        = gameState && a1 && a2 ? getScoreDisplay(gameState, [a1.id, a2.id]) : null;
  const visibleEvents = events.slice(0, 8);

  const a1color = a1?.color ?? '#00d4aa';
  const a2color = a2?.color ?? '#f87171';
  const a1name  = a1?.name ?? 'Agent A';
  const a2name  = a2?.name ?? 'Agent B';
  const a1score = score?.current.a1 ?? 0;
  const a2score = score?.current.a2 ?? 0;

  const m1 = gameState?.momentum[a1?.id ?? ''] ?? 50;
  const m2 = gameState?.momentum[a2?.id ?? ''] ?? 50;

  const lastAction = gameState?.lastAction ?? '';

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-5">

      {/* ── Score Banner ── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 mb-4 select-none"
        style={{
          background: `linear-gradient(to right, ${a1color}22 0%, #0a0a12 40%, #0a0a12 60%, ${a2color}22 100%)`,
        }}
      >
        {/* Colored side strips */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: a1color, opacity: 0.6 }} />
        <div className="absolute right-0 top-0 bottom-0 w-1 rounded-r-2xl" style={{ background: a2color, opacity: 0.6 }} />

        <div className="px-6 py-5 flex items-center">
          {/* Left agent */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: a1color, boxShadow: `0 0 10px ${a1color}` }} />
              <span className="text-base font-bold truncate" style={{ color: a1color }}>
                {a1name}{gameState?.winner === a1?.id && ' 🏆'}
              </span>
            </div>
            {/* Set dots */}
            {score && (
              <div className="flex gap-1 pl-5">
                {Array.from({ length: gameState?.sport === 'table-tennis' ? 3 : 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      background: i < score.setsWon.a1 ? a1color : 'rgba(255,255,255,0.1)',
                      boxShadow: i < score.setsWon.a1 ? `0 0 6px ${a1color}` : 'none',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Center: scores */}
          <div className="flex items-center gap-4 px-4 shrink-0">
            <div
              key={`${a1score}-blast`}
              className="text-6xl font-black tabular-nums leading-none"
              style={{ animation: mounted ? 'score-blast 0.5s ease-out' : 'none', color: a1color, textShadow: `0 0 30px ${a1color}88` }}
            >
              {a1score}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/20 text-xl font-light">–</span>
              {score && score.sets.length > 1 && (
                <div className="flex flex-col items-center gap-0.5">
                  {score.sets.slice(0, gameState?.currentSet).map((s, i) => (
                    <span key={i} className="text-[9px] text-white/25 font-mono">{s.a1}–{s.a2}</span>
                  ))}
                </div>
              )}
            </div>
            <div
              key={`${a2score}-blast`}
              className="text-6xl font-black tabular-nums leading-none"
              style={{ animation: mounted ? 'score-blast 0.5s ease-out' : 'none', color: a2color, textShadow: `0 0 30px ${a2color}88` }}
            >
              {a2score}
            </div>
          </div>

          {/* Right agent */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5 items-end">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold truncate" style={{ color: a2color }}>
                {gameState?.winner === a2?.id && '🏆 '}{a2name}
              </span>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: a2color, boxShadow: `0 0 10px ${a2color}` }} />
            </div>
            {score && (
              <div className="flex gap-1 pr-5">
                {Array.from({ length: gameState?.sport === 'table-tennis' ? 3 : 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      background: i < score.setsWon.a2 ? a2color : 'rgba(255,255,255,0.1)',
                      boxShadow: i < score.setsWon.a2 ? `0 0 6px ${a2color}` : 'none',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Momentum bars */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
          {([
            { agent: a1, m: m1, label: a1name, color: a1color },
            { agent: a2, m: m2, label: a2name, color: a2color },
          ] as { agent: Agent | undefined; m: number; label: string; color: string }[]).map(({ m, label, color }) => {
            const barColor = m > 65 ? '#22c55e' : m < 35 ? '#ef4444' : color;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-widest text-white/30 w-12 truncate shrink-0">{label}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${m}%`, background: barColor, boxShadow: `0 0 6px ${barColor}66` }}
                  />
                </div>
                <span className="text-[9px] text-white/30 tabular-nums w-6 text-right">{Math.round(m)}</span>
              </div>
            );
          })}
        </div>

        {/* Status badges */}
        <div className="absolute top-3 right-4 flex items-center gap-2">
          {isLive && (
            <span
              className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-emerald-400 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.12)', animation: 'live-breathe 2s infinite' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              LIVE
            </span>
          )}
          {!isLive && status === 'settled' && (
            <span
              className="text-[10px] font-black tracking-widest text-yellow-400 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(250,204,21,0.12)' }}
            >
              FINAL
            </span>
          )}
          {gameState && (
            <span className="text-[9px] font-mono text-white/20">Rally #{gameState.rallyCount}</span>
          )}
        </div>

        {/* Last action badge */}
        {lastAction && (
          <div className="absolute bottom-3 right-4">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{
                background: `${ACTION_COLORS[lastAction] ?? '#888'}22`,
                color: ACTION_COLORS[lastAction] ?? '#888',
              }}
            >
              {ACTION_EMOJI[lastAction] ?? ''} {lastAction}
            </span>
          </div>
        )}
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="grid gap-4 lg:grid-cols-[55fr_45fr]">

        {/* ── LEFT COL ── */}
        <div className="flex flex-col gap-4">

          {/* Court + Impact Overlay */}
          {gameState ? (
            <div className="relative">
              <CourtCanvas
                gameState={gameState}
                agentNames={agentNames}
                agentColors={agentColors}
                className="w-full"
              />
              {/* Impact overlay */}
              <div
                key={`${gameState.lastAction}-${gameState.rallyCount}`}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                style={{ animation: mounted ? 'impact-flash 0.8s ease-out forwards' : 'none' }}
              >
                <span
                  className="text-4xl font-black"
                  style={{
                    color: ACTION_COLORS[gameState.lastAction ?? ''] ?? 'white',
                    textShadow: `0 0 20px ${ACTION_COLORS[gameState.lastAction ?? ''] ?? 'white'}`,
                  }}
                >
                  {ACTION_EMOJI[gameState.lastAction ?? '']} {gameState.lastAction}
                </span>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl border border-white/10 w-full flex items-center justify-center"
              style={{ aspectRatio: '4/5', minHeight: 300, background: '#060d1a' }}
            >
              <div className="flex flex-col items-center gap-3 text-white/30">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                <span className="text-xs">Loading court…</span>
              </div>
            </div>
          )}

          {/* Trainer Consoles */}
          {status === 'live' && agents.map(a => (
            <TrainerConsole
              key={a.id}
              competitionId={competitionId}
              agentId={a.id}
              agentName={a.name}
              agentOwner={a.owner}
            />
          ))}

          {/* Play-by-Play Feed */}
          <div
            className="rounded-xl border border-white/10 flex flex-col overflow-hidden"
            style={{ background: '#0d1829' }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-semibold text-white/40">
                  Play-by-Play
                </span>
                {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </div>
              <span className="text-[9px] font-mono text-white/20">{events.length} events</span>
            </div>

            <div className="overflow-y-auto max-h-64 flex flex-col divide-y divide-white/5">
              {visibleEvents.length === 0 ? (
                <div className="px-4 py-6 text-center text-white/30 text-xs">
                  No events yet — match starting soon.
                </div>
              ) : (
                visibleEvents.map(ev => (
                  <FeedItem
                    key={ev.id}
                    ev={ev}
                    getAgentName={getAgentName}
                    getAgentColor={getAgentColor}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COL ── */}
        <div className="flex flex-col gap-4">

          {/* ESPN Scoreboard Strip */}
          {gameState && (
            <SportScoreboard
              gameState={gameState}
              agents={agents}
              isLive={isLive}
            />
          )}

          {/* Agent Duel Cards */}
          {a1 && a2 && (
            <div className="grid grid-cols-2 gap-3">
              <AgentDuelCard
                agent={a1}
                oppAgent={a2}
                gameState={gameState}
                isWinner={winnerId === a1.id}
                agentStats={agentStats}
              />
              <AgentDuelCard
                agent={a2}
                oppAgent={a1}
                gameState={gameState}
                isWinner={winnerId === a2.id}
                agentStats={agentStats}
              />
            </div>
          )}

          {/* Betting Panel */}
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
        </div>
      </div>
    </div>
  );
}
