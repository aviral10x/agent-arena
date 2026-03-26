'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { SportScoreboard } from './sport-scoreboard';
import { BettingPanelClient } from './betting-panel-client';
import type { GameState } from '@/lib/game-engine';
import { getScoreDisplay } from '@/lib/game-engine';

// Three.js + wagmi components must be client-side only (no SSR)
const CourtCanvas = dynamic(
  () => import('./court-canvas').then(m => ({ default: m.CourtCanvas })),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full rounded-xl border border-white/10 flex items-center justify-center"
        style={{ aspectRatio: '4/5', minHeight: 300, background: 'var(--bg-card, #060d1a)' }}
      >
        <div className="flex flex-col items-center gap-3 text-white/30">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          <span className="text-xs">Loading 3D court…</span>
        </div>
      </div>
    ),
  }
);

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

const ACTION_ICONS: Record<string, string> = {
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
  SMASH:   '#f87171',  // red-400
  DROP:    '#c084fc',  // purple-400
  CLEAR:   '#60a5fa',  // blue-400
  DRIVE:   '#fbbf24',  // amber-400
  LOB:     '#34d399',  // emerald-400
  BLOCK:   '#9ca3af',  // gray-400
  SERVE:   '#f1f5f9',  // slate-100
  SPECIAL: '#facc15',  // yellow-400
};

const SPORT_LABELS: Record<string, string> = {
  badminton:      '🏸 Badminton',
  tennis:         '🎾 Tennis',
  'table-tennis': '🏓 Table Tennis',
};

// ── Fake stats since Agent model has speed/power/accuracy/stamina but we don't
// get them through the props. Derive from color hue for visual variety.
function deriveStats(color: string): { speed: number; power: number; accuracy: number; stamina: number } {
  // hash the color string to get deterministic pseudo-stats
  let h = 0;
  for (let i = 0; i < color.length; i++) h = (h * 31 + color.charCodeAt(i)) >>> 0;
  const rand = (seed: number, lo: number, hi: number) => lo + ((seed ^ (seed >> 7)) % (hi - lo + 1));
  return {
    speed:    rand(h,       5, 10),
    power:    rand(h ^ 0xAB, 4, 10),
    accuracy: rand(h ^ 0xCD, 5, 10),
    stamina:  rand(h ^ 0xEF, 4, 10),
  };
}

function calcWinProb(agentId: string, agents: Agent[], gameState: GameState | null): number {
  if (!gameState || agents.length < 2) return 50;
  const [a1, a2] = agents;
  const score = getScoreDisplay(gameState, [a1.id, a2.id]);
  const m1 = gameState.momentum[a1.id] ?? 50;
  const m2 = gameState.momentum[a2.id] ?? 50;
  const totalMom = m1 + m2 || 100;

  // sets won component
  const maxSets = gameState.sport === 'table-tennis' ? 5 : 3;
  const s1 = score.setsWon.a1;
  const s2 = score.setsWon.a2;

  // current set score component
  const cs1 = score.current.a1;
  const cs2 = score.current.a2;
  const totalPts = cs1 + cs2 || 1;

  const probForA1 =
    0.30 * (s1 / (maxSets / 2)) +
    0.30 * ((gameState.momentum[a1.id] ?? 50) / totalMom) +
    0.40 * (cs1 / totalPts);

  const raw = agentId === a1.id ? probForA1 : (1 - probForA1);
  return Math.round(Math.min(0.97, Math.max(0.03, raw)) * 100);
}

// ── Agent Card ────────────────────────────────────────────────────────────────
function AgentCard({
  agent,
  gameState,
  agents,
  isWinner,
}: {
  agent: Agent;
  gameState: GameState | null;
  agents: Agent[];
  isWinner: boolean;
}) {
  const stats = deriveStats(agent.color);
  const momentum = gameState?.momentum[agent.id] ?? 50;
  const winProb = calcWinProb(agent.id, agents, gameState);

  const moColor = momentum > 65 ? '#22c55e' : momentum < 35 ? '#ef4444' : agent.color;

  // Determine play style from stats
  const maxStat = Math.max(stats.speed, stats.power, stats.accuracy, stats.stamina);
  const playStyle =
    maxStat === stats.speed    ? { label: 'SPEEDSTER',  color: '#fbbf24' } :
    maxStat === stats.power    ? { label: 'POWERHOUSE', color: '#f87171' } :
    maxStat === stats.accuracy ? { label: 'PRECISION',  color: '#c084fc' } :
                                 { label: 'ENDURANCE',  color: '#34d399' };

  // SVG arc for momentum ring
  const r = 28;
  const cx = 36;
  const cy = 36;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - momentum / 100);

  return (
    <div
      className="relative overflow-hidden rounded-xl border p-4 flex flex-col gap-3 transition-all duration-300"
      style={{
        borderColor: `${agent.color}33`,
        background: `linear-gradient(135deg, ${agent.color}0d 0%, var(--bg-card, #0d1829) 60%)`,
      }}
    >
      {/* Winner glow */}
      {isWinner && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: `inset 0 0 24px ${agent.color}44`, border: `1px solid ${agent.color}88` }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: agent.color, boxShadow: `0 0 8px ${agent.color}` }} />
          <span className="text-base font-bold truncate" style={{ color: agent.color }}>
            {agent.name}
          </span>
          {isWinner && <span className="text-yellow-400 text-sm">🏆</span>}
        </div>
        <span
          className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded shrink-0"
          style={{ background: `${playStyle.color}22`, color: playStyle.color }}
        >
          {playStyle.label}
        </span>
      </div>

      {/* Momentum ring + win prob */}
      <div className="flex items-center gap-3">
        {/* Ring */}
        <div className="relative shrink-0" style={{ width: 72, height: 72 }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            {/* Track */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="4"
            />
            {/* Arc */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={moColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
                filter: `drop-shadow(0 0 4px ${moColor})`,
              }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-black tabular-nums" style={{ color: moColor }}>
              {Math.round(momentum)}
            </span>
            <span className="text-[8px] uppercase tracking-widest text-white/30">mo</span>
          </div>
        </div>

        {/* Win prob + stat bars */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-white/30">Win Prob</span>
            <div className="text-xl font-black tabular-nums" style={{ color: winProb > 60 ? '#22c55e' : winProb < 40 ? '#ef4444' : 'white' }}>
              {winProb}%
            </div>
          </div>
        </div>
      </div>

      {/* Stat bars */}
      <div className="space-y-1.5">
        {([
          ['SPD', stats.speed,    agent.color],
          ['PWR', stats.power,    '#f87171'],
          ['ACC', stats.accuracy, '#c084fc'],
          ['STA', stats.stamina,  '#34d399'],
        ] as [string, number, string][]).map(([label, val, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest text-white/30 w-7 shrink-0">
              {label}
            </span>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${val * 10}%`, background: color, boxShadow: `0 0 4px ${color}66` }}
              />
            </div>
            <span className="text-[9px] text-white/30 tabular-nums w-4 text-right">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Rally Feed Item ───────────────────────────────────────────────────────────
function RallyFeedItem({
  ev,
  getAgentName,
  getAgentColor,
  isNew,
}: {
  ev: TradeEvent;
  getAgentName: (id: string) => string;
  getAgentColor: (id: string) => string;
  isNew: boolean;
}) {
  const icon  = ACTION_ICONS[ev.type] ?? '•';
  const color = ACTION_COLORS[ev.type] ?? 'rgba(255,255,255,0.7)';
  const agentColor = getAgentColor(ev.agentId);
  const agentName  = getAgentName(ev.agentId);
  const isPoint    = ev.type === 'POINT' || (ev.pair && ev.pair.toLowerCase().includes('point'));
  const isSpecial  = ev.type === 'SPECIAL';

  return (
    <div
      className="flex gap-2 items-start rounded-lg px-2 py-1.5 transition-all"
      style={{
        animation: isNew ? 'rally-slide-in 0.3s ease-out' : 'none',
        background: isPoint
          ? 'rgba(250,204,21,0.06)'
          : isSpecial
          ? 'rgba(250,204,21,0.04)'
          : 'transparent',
        borderLeft: `2px solid ${agentColor}44`,
      }}
    >
      {/* Icon */}
      <span className="text-sm shrink-0 leading-none mt-0.5">{icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold" style={{ color: agentColor }}>
            {agentName}
          </span>
          <span className="text-xs font-mono font-semibold" style={{ color }}>
            {ev.type}
          </span>
          {isPoint && (
            <span className="text-[9px] font-black tracking-widest text-yellow-400 px-1 py-0.5 rounded" style={{ background: 'rgba(250,204,21,0.15)' }}>
              POINT!
            </span>
          )}
          {isSpecial && (
            <span className="text-[9px] font-black tracking-widest text-yellow-300 px-1 py-0.5 rounded" style={{ background: 'rgba(250,204,21,0.12)' }}>
              SPECIAL
            </span>
          )}
        </div>
        {ev.rationale && (
          <p className="text-[10px] font-mono text-white/30 truncate mt-0.5">
            {ev.rationale.slice(0, 80)}
          </p>
        )}
      </div>

      {/* Timestamp */}
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
  const [gameState, setGameState] = useState<GameState | null>(() => {
    try { return initialGameState ? JSON.parse(initialGameState) : null; } catch { return null; }
  });
  const [events, setEvents] = useState<TradeEvent[]>(initialTrades);
  const [isLive, setIsLive] = useState(status === 'live');
  const [scoreFlash, setScoreFlash] = useState<{ a1: boolean; a2: boolean }>({ a1: false, a2: false });
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const prevScore = useRef<{ a1: number; a2: number } | null>(null);
  const prevEventCount = useRef(initialTrades.length);

  const agentNames  = Object.fromEntries(agents.map(a => [a.id, a.name]));
  const agentColors = Object.fromEntries(agents.map(a => [a.id, a.color]));

  const getAgentName  = (id: string) => agents.find(a => a.id === id)?.name ?? id;
  const getAgentColor = (id: string) => agents.find(a => a.id === id)?.color ?? '#888';

  const [a1, a2] = agents;

  // Detect score changes → trigger flash animation
  useEffect(() => {
    if (!gameState || !a1 || !a2) return;
    const score = getScoreDisplay(gameState, [a1.id, a2.id]);
    if (prevScore.current) {
      if (score.current.a1 > prevScore.current.a1) {
        setScoreFlash(f => ({ ...f, a1: true }));
        setTimeout(() => setScoreFlash(f => ({ ...f, a1: false })), 700);
      }
      if (score.current.a2 > prevScore.current.a2) {
        setScoreFlash(f => ({ ...f, a2: true }));
        setTimeout(() => setScoreFlash(f => ({ ...f, a2: false })), 700);
      }
    }
    prevScore.current = score.current;
  }, [gameState, a1, a2]);

  // Detect new events for slide-in animation
  useEffect(() => {
    if (events.length > prevEventCount.current) {
      const fresh = events.slice(0, events.length - prevEventCount.current).map(e => e.id);
      setNewEventIds(new Set(fresh));
      setTimeout(() => setNewEventIds(new Set()), 1000);
    }
    prevEventCount.current = events.length;
  }, [events]);

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
    es.onerror = () => {};
    return () => es.close();
  }, [competitionId, status]);

  // Poll for new events
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

  const score = gameState && a1 && a2 ? getScoreDisplay(gameState, [a1.id, a2.id]) : null;
  const visibleEvents = events.slice(0, 8);

  return (
    <>
      <style>{`
        @keyframes score-pulse {
          0%   { transform: scale(1);    filter: brightness(1); }
          30%  { transform: scale(1.18); filter: brightness(1.8); }
          60%  { transform: scale(1.05); filter: brightness(1.3); }
          100% { transform: scale(1);    filter: brightness(1); }
        }
        @keyframes rally-slide-in {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1;   box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          50%       { opacity: 0.7; box-shadow: 0 0 0 5px rgba(34,197,94,0); }
        }
        @keyframes winner-glow {
          0%, 100% { box-shadow: 0 0 0 2px rgba(250,204,21,0.5); }
          50%       { box-shadow: 0 0 0 8px rgba(250,204,21,0.15); }
        }
        @keyframes fade-in {
          from { opacity: 0; } to { opacity: 1; }
        }
        .score-flash {
          animation: score-pulse 0.7s cubic-bezier(0.36,0.07,0.19,0.97) forwards;
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-5">

        {/* ── Sport badge row ── */}
        <div className="mb-3 flex items-center gap-3">
          <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            {SPORT_LABELS[sport] ?? sport}
          </span>
          {isLive && (
            <span
              className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-emerald-400 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.12)', animation: 'live-pulse 2s infinite' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              LIVE
            </span>
          )}
          {!isLive && status === 'settled' && winnerId && (
            <span
              className="text-[10px] font-black tracking-widest text-yellow-400 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(250,204,21,0.12)', animation: 'winner-glow 2s infinite' }}
            >
              🏆 {getAgentName(winnerId)} wins!
            </span>
          )}
          {gameState && (
            <span className="ml-auto text-[10px] font-mono text-white/20">
              Rally #{gameState.rallyCount}
            </span>
          )}
        </div>

        {/* ── HERO SCORE BANNER ── */}
        {gameState && score && a1 && a2 ? (
          <div
            className="relative overflow-hidden rounded-2xl border border-white/10 mb-4 select-none"
            style={{
              background: `linear-gradient(90deg, ${a1.color}22 0%, var(--bg-card, #0d1829) 35%, var(--bg-card, #0d1829) 65%, ${a2.color}22 100%)`,
            }}
          >
            {/* Subtle inner glow lines */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: a1.color, opacity: 0.5 }} />
            <div className="absolute right-0 top-0 bottom-0 w-1 rounded-r-2xl" style={{ background: a2.color, opacity: 0.5 }} />

            <div className="px-6 py-5 flex items-center">
              {/* Agent 1 side */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: a1.color, boxShadow: `0 0 10px ${a1.color}` }} />
                  <span className="text-base font-bold truncate" style={{ color: a1.color }}>
                    {a1.name}
                    {gameState.winner === a1.id && ' 🏆'}
                  </span>
                </div>
                {/* Sets won */}
                <div className="flex gap-1 pl-5">
                  {Array.from({ length: gameState.sport === 'table-tennis' ? 3 : 2 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full transition-all duration-300"
                      style={{
                        background: i < score.setsWon.a1 ? a1.color : 'rgba(255,255,255,0.1)',
                        boxShadow: i < score.setsWon.a1 ? `0 0 6px ${a1.color}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Center scores */}
              <div className="flex items-center gap-4 px-4 shrink-0">
                {/* Score A1 */}
                <span
                  className={`text-6xl font-black tabular-nums leading-none ${scoreFlash.a1 ? 'score-flash' : ''}`}
                  style={{ color: a1.color, textShadow: `0 0 30px ${a1.color}88` }}
                >
                  {score.current.a1}
                </span>

                {/* Divider */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-white/20 text-xl font-light">–</span>
                  {score.sets.length > 1 && (
                    <div className="flex flex-col items-center gap-0.5">
                      {score.sets.slice(0, gameState.currentSet).map((s, i) => (
                        <span key={i} className="text-[9px] text-white/25 font-mono">
                          {s.a1}–{s.a2}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Score A2 */}
                <span
                  className={`text-6xl font-black tabular-nums leading-none ${scoreFlash.a2 ? 'score-flash' : ''}`}
                  style={{ color: a2.color, textShadow: `0 0 30px ${a2.color}88` }}
                >
                  {score.current.a2}
                </span>
              </div>

              {/* Agent 2 side */}
              <div className="flex-1 min-w-0 flex flex-col gap-1 items-end">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold truncate" style={{ color: a2.color }}>
                    {gameState.winner === a2.id && '🏆 '}
                    {a2.name}
                  </span>
                  <div className="w-3 h-3 rounded-full" style={{ background: a2.color, boxShadow: `0 0 10px ${a2.color}` }} />
                </div>
                <div className="flex gap-1 pr-5">
                  {Array.from({ length: gameState.sport === 'table-tennis' ? 3 : 2 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full transition-all duration-300"
                      style={{
                        background: i < score.setsWon.a2 ? a2.color : 'rgba(255,255,255,0.1)',
                        boxShadow: i < score.setsWon.a2 ? `0 0 6px ${a2.color}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Momentum bars */}
            <div className="px-6 pb-3 grid grid-cols-2 gap-3">
              {[{ agent: a1, key: 'a1' as const }, { agent: a2, key: 'a2' as const }].map(({ agent }) => {
                const m = gameState.momentum[agent.id] ?? 50;
                const barColor = m > 65 ? '#22c55e' : m < 35 ? '#ef4444' : agent.color;
                return (
                  <div key={agent.id} className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-white/30 w-12 truncate shrink-0">
                      {agent.name}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${m}%`,
                          background: barColor,
                          boxShadow: `0 0 6px ${barColor}66`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-white/30 tabular-nums w-6 text-right">{Math.round(m)}</span>
                  </div>
                );
              })}
            </div>

            {/* Last action label */}
            {gameState.lastAction && (
              <div className="absolute bottom-2 right-4 text-[9px] font-mono text-white/20 uppercase tracking-widest">
                {ACTION_ICONS[gameState.lastAction] ?? ''} {gameState.lastAction} · rally len {gameState.rallyLength}
              </div>
            )}
          </div>
        ) : (
          <div
            className="rounded-2xl border border-white/10 p-8 text-center mb-4"
            style={{ background: 'var(--bg-card, #0d1829)' }}
          >
            <p className="text-white/40 text-sm">
              {status === 'live'
                ? 'Match starting… first tick coming up.'
                : 'Match has not started yet.'}
            </p>
          </div>
        )}

        {/* ── MAIN LAYOUT GRID ── */}
        <div className="grid gap-4 lg:grid-cols-[60fr_40fr]">

          {/* ── LEFT COL: Court + Rally Feed ── */}
          <div className="flex flex-col gap-4">

            {/* Court Canvas */}
            {gameState ? (
              <CourtCanvas
                gameState={gameState}
                agentNames={agentNames}
                agentColors={agentColors}
                className="w-full"
              />
            ) : (
              <div
                className="rounded-xl border border-white/10 w-full aspect-[4/5] flex items-center justify-center"
                style={{ background: 'var(--bg-card, #060d1a)' }}
              >
                <span className="text-white/30 text-sm">Court loading…</span>
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

            {/* Play-by-play Rally Feed */}
            <div
              className="rounded-xl border border-white/10 flex flex-col overflow-hidden"
              style={{ background: 'var(--bg-card, #0d1829)' }}
            >
              {/* Feed header */}
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b border-white/8"
                style={{ borderBottomColor: 'rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-white/40">
                    Play-by-Play
                  </span>
                  {isLive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <span className="text-[9px] font-mono text-white/20">
                  {events.length} events
                </span>
              </div>

              {/* Feed items */}
              <div className="overflow-y-auto max-h-[320px] flex flex-col divide-y divide-white/5">
                {visibleEvents.length === 0 && (
                  <div className="px-4 py-6 text-center text-white/30 text-xs">
                    No events yet — match starting soon.
                  </div>
                )}
                {visibleEvents.map(ev => (
                  <RallyFeedItem
                    key={ev.id}
                    ev={ev}
                    getAgentName={getAgentName}
                    getAgentColor={getAgentColor}
                    isNew={newEventIds.has(ev.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT COL: Agent Cards + Betting + Scoreboard ── */}
          <div className="flex flex-col gap-4">

            {/* Compact scoreboard strip */}
            {gameState && (
              <SportScoreboard
                gameState={gameState}
                agents={agents}
                isLive={isLive}
              />
            )}

            {/* Agent Cards */}
            {a1 && a2 && (
              <div className="grid grid-cols-2 gap-3">
                <AgentCard
                  agent={a1}
                  gameState={gameState}
                  agents={agents}
                  isWinner={winnerId === a1.id}
                />
                <AgentCard
                  agent={a2}
                  gameState={gameState}
                  agents={agents}
                  isWinner={winnerId === a2.id}
                />
              </div>
            )}

            {/* Betting panel */}
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
    </>
  );
}
