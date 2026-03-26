'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { SportScoreboard } from './sport-scoreboard';
import { BettingPanelClient } from './betting-panel-client';
import { CourtCanvas } from './court-canvas';
import { playSFX } from '@/lib/sport-sfx';
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
  SMASH:   '#ff2d78',   // neon-magenta
  DROP:    '#c084fc',   // purple
  CLEAR:   '#00f0ff',   // neon-cyan
  DRIVE:   '#ffd666',   // amber/gold
  LOB:     '#00ff87',   // neon-green
  BLOCK:   '#9ca3af',
  SERVE:   '#e8f0ff',
  SPECIAL: '#ffd666',
  POINT:   '#ffd666',
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
              style={{ fontFamily: 'var(--font-body)', background: 'rgba(0,240,255,0.10)', color: 'var(--neon-cyan)', border: '1px solid rgba(0,240,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
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

  // ── SFX: fire on every action change ────────────────────────────────────────
  const prevActionRef = useRef('');
  const prevScoreRef  = useRef({ a1: 0, a2: 0 });
  useEffect(() => {
    if (!mounted) return;
    if (lastAction && lastAction !== prevActionRef.current) {
      prevActionRef.current = lastAction;
      // Volume based on power: SMASH/SPECIAL loudest
      const vol = ['SMASH', 'SPECIAL'].includes(lastAction) ? 0.7
                : ['DRIVE', 'DROP'].includes(lastAction)    ? 0.5
                : 0.35;
      playSFX(lastAction, vol);
    }
    // Point sound when score changes
    const cur = { a1: a1score, a2: a2score };
    if ((cur.a1 !== prevScoreRef.current.a1 || cur.a2 !== prevScoreRef.current.a2) &&
        (prevScoreRef.current.a1 > 0 || prevScoreRef.current.a2 > 0)) {
      playSFX('POINT', 0.6);
    }
    prevScoreRef.current = cur;
  }, [lastAction, a1score, a2score, mounted]);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#05060e] overflow-hidden">
      {/* ── Scanline overlay ── */}
      <div className="scanline-overlay absolute inset-0 z-10 pointer-events-none" />

      {/* ── 3-column Stitch layout: agent-left | arena | agent-right ── */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden relative z-20">

        {/* ── LEFT SIDEBAR: Agent A Panel ── */}
        <aside className="col-span-3 bg-[#11131d] border-r border-[#00f0ff]/10 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-8">

            {/* Agent A Profile */}
            {a1 && (
              <div className="space-y-4">
                {/* Avatar area */}
                <div
                  className="relative w-full bg-black overflow-hidden border-2"
                  style={{
                    aspectRatio: '1/1',
                    borderColor: `${a1color}66`,
                    boxShadow: `0 0 20px ${a1color}33`,
                  }}
                >
                  {/* Color fill */}
                  <div className="absolute inset-0" style={{ background: `${a1color}11` }} />
                  <div className="absolute bottom-0 left-0 w-full p-4"
                    style={{ background: `linear-gradient(to top, ${a1color}33, transparent)` }}
                  >
                    <h2
                      className="font-['Bebas_Neue'] text-4xl tracking-wider uppercase"
                      style={{ color: a1color }}
                    >
                      {a1name}{gameState?.winner === a1.id && ' 🏆'}
                    </h2>
                    <p className="font-mono text-[10px]" style={{ color: `${a1color}99` }}>
                      NEURAL_SYNC: {Math.round(m1)}% // {m1 > 65 ? 'OPTIMAL' : 'FLUCTUATING'}
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black p-3 border-l-2 border-[#00f0ff]">
                    <p className="text-[10px] font-['Space_Grotesk'] text-[#747480] uppercase tracking-tighter">Momentum</p>
                    <p className="font-mono text-xl text-[#00f0ff]">{Math.round(m1)}%</p>
                  </div>
                  <div className="bg-black p-3 border-l-2 border-[#ffd666]">
                    <p className="text-[10px] font-['Space_Grotesk'] text-[#747480] uppercase tracking-tighter">Score</p>
                    <p className="font-mono text-xl text-[#ffd666]">{a1score}</p>
                  </div>
                </div>

                {/* Momentum bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="font-mono text-[10px]" style={{ color: a1color }}>MOMENTUM_ENGINE</span>
                    <span className="font-mono text-lg" style={{ color: a1color }}>{Math.round(m1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-black overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${m1}%`,
                        background: a1color,
                        boxShadow: `0 0 10px ${a1color}`,
                        animation: 'momentum-fire 2s ease-in-out infinite',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Agent A stats from duel card */}
            {a1 && (
              <div className="space-y-4">
                <h3 className="font-['Space_Grotesk'] text-xs font-bold text-[#464752] uppercase border-b border-[#464752]/20 pb-2">
                  Active_Tactics
                </h3>
                <AgentDuelCard
                  agent={a1}
                  oppAgent={a2}
                  gameState={gameState}
                  isWinner={winnerId === a1.id}
                  agentStats={agentStats}
                />
              </div>
            )}
          </div>
        </aside>

        {/* ── CENTER: Arena Canvas ── */}
        <div className="col-span-6 bg-black relative flex flex-col overflow-hidden">

          {/* Top Live Score bar */}
          <div className="h-20 flex items-stretch border-b border-[#00f0ff]/5 z-30 shrink-0">
            <div
              className="flex-1 flex flex-col items-center justify-center px-4"
              style={{ background: `linear-gradient(to right, ${a1color}1a, transparent)` }}
            >
              <span className="font-mono text-[10px]" style={{ color: `${a1color}99` }}>Challenger_A</span>
              <span className="font-['Bebas_Neue'] text-2xl" style={{ color: a1color }}>{a1name}</span>
            </div>
            <div className="w-48 bg-[#05060e] p-2 flex flex-col items-center justify-center border-x border-[#00f0ff]/20">
              <div className="flex items-center gap-6">
                <span
                  key={`${a1score}-score`}
                  className="font-['Bebas_Neue'] text-5xl"
                  style={{
                    color: '#00f0ff',
                    animation: mounted ? 'score-blast 0.5s ease-out' : 'none',
                  }}
                >
                  {a1score}
                </span>
                <div className="flex flex-col items-center">
                  {isLive && (
                    <span
                      className="font-mono text-[10px] text-[#ffd666] animate-pulse uppercase"
                    >
                      {gameState?.currentSet ? `SET ${gameState.currentSet + 1}` : 'LIVE'}
                    </span>
                  )}
                  {!isLive && status === 'settled' && (
                    <span className="font-mono text-[10px] text-[#ffd666] uppercase">FINAL</span>
                  )}
                  <span className="font-['Space_Grotesk'] text-xl text-[#464752]">
                    {gameState?.rallyCount ? `R${gameState.rallyCount}` : 'VS'}
                  </span>
                </div>
                <span
                  key={`${a2score}-score`}
                  className="font-['Bebas_Neue'] text-5xl"
                  style={{
                    color: '#ff2d78',
                    animation: mounted ? 'score-blast 0.5s ease-out' : 'none',
                  }}
                >
                  {a2score}
                </span>
              </div>
            </div>
            <div
              className="flex-1 flex flex-col items-center justify-center px-4"
              style={{ background: `linear-gradient(to left, ${a2color}1a, transparent)` }}
            >
              <span className="font-mono text-[10px]" style={{ color: `${a2color}99` }}>Defender_B</span>
              <span className="font-['Bebas_Neue'] text-2xl" style={{ color: a2color }}>{a2name}</span>
            </div>
          </div>

          {/* Arena Canvas */}
          <div className="flex-1 relative overflow-hidden">
            {/* Dot grid */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#00f0ff 0.5px, transparent 0.5px)',
                backgroundSize: '32px 32px',
              }}
            />

            {/* Court/Canvas */}
            {gameState ? (
              <div className="relative w-full h-full">
                <CourtCanvas
                  gameState={gameState}
                  agentNames={agentNames}
                  agentColors={agentColors}
                  className="w-full h-full"
                />
                {/* Impact overlay */}
                <div
                  key={`${gameState.lastAction}-${gameState.rallyCount}`}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  style={{ animation: mounted ? 'impact-flash 0.8s ease-out forwards' : 'none' }}
                >
                  <span
                    className="font-['Bebas_Neue'] text-8xl italic drop-shadow-[0_0_20px_rgba(255,108,146,0.8)] leading-none"
                    style={{ color: ACTION_COLORS[gameState.lastAction ?? ''] ?? 'white' }}
                  >
                    {gameState.lastAction}!
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-[#464752]">
                  <div className="w-6 h-6 border-2 border-[#464752] border-t-[#00f0ff] rounded-full animate-spin" />
                  <span className="font-mono text-xs">Loading court…</span>
                </div>
              </div>
            )}

            {/* Corner indicators */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-[#ff716c] opacity-40 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-[#ff716c] opacity-40 pointer-events-none" />

            {/* Status top-right */}
            <div className="absolute top-3 right-4 flex items-center gap-2 z-20">
              <button
                onClick={() => { (window as any).__arenaMuted = !(window as any).__arenaMuted; }}
                className="text-[11px] hover:text-[#aaaab6] transition-colors font-mono"
                style={{ color: 'rgba(255,255,255,0.2)' }}
                title="Toggle SFX"
              >
                {(typeof window !== 'undefined' && (window as any).__arenaMuted) ? '🔇' : '🔊'}
              </button>
              {isLive && (
                <span
                  className="flex items-center gap-1.5 text-[10px] font-black tracking-widest px-2 py-0.5 font-mono"
                  style={{ background: '#00f0ff', color: '#005d63', animation: 'live-breathe 2s infinite' }}
                >
                  <span className="w-1.5 h-1.5 block" style={{ background: '#005d63' }} />
                  LIVE
                </span>
              )}
            </div>

            {/* Last action badge */}
            {lastAction && (
              <div className="absolute bottom-3 right-4 z-20">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 font-mono"
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

          {/* Trainer Console (Stitch bottom center) */}
          <div className="h-24 bg-[#05060e] border-t border-[#00f0ff]/20 p-4 flex items-center gap-4 z-30 shrink-0">
            <div className="w-12 h-12 flex items-center justify-center bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
              <span className="material-symbols-outlined">terminal</span>
            </div>
            <div className="flex-1">
              {status === 'live' && a1 ? (
                <TrainerConsole
                  competitionId={competitionId}
                  agentId={a1.id}
                  agentName={a1.name}
                  agentOwner={a1.owner}
                />
              ) : (
                <div className="font-mono text-sm text-[#464752] uppercase tracking-widest">
                  AWAITING_TRAINER_OVERRIDE_COMMAND...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR: Agent B Panel ── */}
        <aside className="col-span-3 bg-[#11131d] border-l border-[#00f0ff]/10 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-8">

            {/* Agent B Profile */}
            {a2 && (
              <div className="space-y-4">
                {/* Avatar */}
                <div
                  className="relative w-full bg-black overflow-hidden border-2"
                  style={{
                    aspectRatio: '1/1',
                    borderColor: `${a2color}66`,
                    boxShadow: `0 0 20px ${a2color}33`,
                  }}
                >
                  <div className="absolute inset-0" style={{ background: `${a2color}11` }} />
                  <div
                    className="absolute bottom-0 left-0 w-full p-4 text-right"
                    style={{ background: `linear-gradient(to top, ${a2color}33, transparent)` }}
                  >
                    <h2
                      className="font-['Bebas_Neue'] text-4xl tracking-wider uppercase"
                      style={{ color: a2color }}
                    >
                      {gameState?.winner === a2.id && '🏆 '}{a2name}
                    </h2>
                    <p className="font-mono text-[10px]" style={{ color: `${a2color}99` }}>
                      NEURAL_SYNC: {Math.round(m2)}% // {m2 > 65 ? 'OPTIMAL' : 'FLUCTUATING'}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black p-3 border-r-2 border-[#ff2d78] text-right">
                    <p className="text-[10px] font-['Space_Grotesk'] text-[#747480] uppercase tracking-tighter">Momentum</p>
                    <p className="font-mono text-xl text-[#ff2d78]">{Math.round(m2)}%</p>
                  </div>
                  <div className="bg-black p-3 border-r-2 border-[#ffd666] text-right">
                    <p className="text-[10px] font-['Space_Grotesk'] text-[#747480] uppercase tracking-tighter">Score</p>
                    <p className="font-mono text-xl text-[#ffd666]">{a2score}</p>
                  </div>
                </div>

                {/* Momentum bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="font-mono text-[10px]" style={{ color: a2color }}>STRESS_LOAD</span>
                    <span className="font-mono text-lg" style={{ color: a2color }}>{Math.round(m2)}%</span>
                  </div>
                  <div className="h-2 w-full bg-black overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${m2}%`,
                        background: a2color,
                        boxShadow: `0 0 10px ${a2color}`,
                        animation: 'momentum-fire 2s ease-in-out infinite',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Rally Telemetry */}
            <div className="space-y-4">
              <h3 className="font-['Space_Grotesk'] text-xs font-bold text-[#464752] uppercase border-b border-[#464752]/20 pb-2">
                Rally_Telemetry
              </h3>
              <div className="space-y-2 font-mono text-[11px] max-h-48 overflow-y-auto">
                {visibleEvents.length === 0 ? (
                  <p className="text-[#464752] text-[10px]">No events yet…</p>
                ) : (
                  visibleEvents.slice(0, 5).map(ev => {
                    const agentColor = getAgentColor(ev.agentId);
                    const agentName  = getAgentName(ev.agentId);
                    const color      = ACTION_COLORS[ev.type] ?? '#aaaab6';
                    return (
                      <div
                        key={ev.id}
                        className="p-2 bg-black border-l"
                        style={{ borderColor: `${agentColor}66` }}
                      >
                        <span style={{ color: agentColor }}>
                          [{new Date(ev.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                        </span>{' '}
                        <span className="text-[#eeecfa]">{agentName}</span>
                        <div className="mt-1 flex gap-2">
                          <span className="px-1" style={{ background: `${color}33`, color }}>
                            {ev.type}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Agent B duel card */}
            {a2 && (
              <AgentDuelCard
                agent={a2}
                oppAgent={a1}
                gameState={gameState}
                isWinner={winnerId === a2.id}
                agentStats={agentStats}
              />
            )}
          </div>
        </aside>

        {/* ── Bottom overlay: Betting ── */}
        <div className="absolute bottom-24 left-0 w-full z-40 p-4 grid grid-cols-12 gap-4 pointer-events-none">
          {/* Betting Panel */}
          <div className="col-span-3 glass-panel p-4 pointer-events-auto border border-[#00f0ff]/20">
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
          <div className="col-span-6" />
          {/* Scoreboard bottom-right */}
          {gameState && (
            <div className="col-span-3 glass-panel p-4 pointer-events-auto border border-[#464752]/30">
              <SportScoreboard
                gameState={gameState}
                agents={agents}
                isLive={isLive}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
