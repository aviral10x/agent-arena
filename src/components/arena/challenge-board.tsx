'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '@/hooks/use-wallet';
import type { TrainerStrategy } from '@/lib/game-engine';

type AgentRow = {
  id: string; name: string; archetype: string; color: string;
  risk: string; winRate?: string; traits: string[]; competitions: any[];
};

// Only badminton is supported in this version
const SPORT = 'badminton';

const SHOT_PRESETS: Record<string, TrainerStrategy['shotBias']> = {
  'Smash-heavy': { smash: 0.55, drop: 0.15, drive: 0.15, clear: 0.15 },
  'Net play':    { smash: 0.15, drop: 0.45, drive: 0.20, clear: 0.20 },
  'Rally':       { smash: 0.10, drop: 0.15, drive: 0.20, clear: 0.55 },
  'Auto':        undefined,
};

const DEFAULT_STRATEGY: TrainerStrategy = {
  gameplan: 'balanced',
  specialTiming: 'late',
};

export function ChallengeBoard({ agents }: { agents: AgentRow[] }) {
  const router        = useRouter();
  const params        = useSearchParams();
  const { ready, connected, address: walletAddress, connect } = useWallet();

  const [opponentId,   setOpponentId]   = useState<string | null>(null);
  const [myAgentId,    setMyAgentId]    = useState<string>(params.get('myAgentId') ?? '');
  const [myAgents,     setMyAgents]     = useState<AgentRow[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [strategy,     setStrategy]     = useState<TrainerStrategy>(DEFAULT_STRATEGY);
  const [shotPreset,   setShotPreset]   = useState('Auto');
  const [zones,        setZones]        = useState<number[]>([]);

  // Fetch agents owned by the connected wallet
  useEffect(() => {
    if (!ready) return;
    const addr = walletAddress ?? '';
    if (!addr) return;
    fetch(`/api/agents?owner=${encodeURIComponent(addr)}`)
      .then(r => r.json())
      .then((data: AgentRow[]) => {
        setMyAgents(data);
        if (!params.get('myAgentId') && data.length > 0) setMyAgentId(data[0].id);
      })
      .catch(() => {});
  }, [ready, walletAddress, params]);

  const opponent   = agents.find(a => a.id === opponentId);
  const myAgent    = myAgents.find(a => a.id === myAgentId) ?? agents.find(a => a.id === myAgentId);

  // Challenge creation is FREE — x402 payments happen during the match via agent wallets

  const handleChallenge = async () => {
    if (!opponentId)  { setError('Select an opponent first.');          return; }
    if (!myAgentId)   { setError('Select or create your fighter first.'); return; }
    if (opponentId === myAgentId) { setError('Cannot challenge yourself — pick a different fighter or opponent.'); return; }
    setLoading(true); setError(null);

    // ── Create competition (no payment — challenges are free) ──
    // x402 payments happen during the match via agent wallets, not at challenge time
    try {
      const compRes = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAgentId:     opponentId,
          challengerAgentId: myAgentId,
          type:              'sport',
          sport:             SPORT,
          strategy: {
            ...strategy,
            shotBias: SHOT_PRESETS[shotPreset],
            targetZones: zones.length > 0 ? zones : undefined,
          },
        }),
      });
      if (!compRes.ok) {
        const data = await compRes.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create challenge');
      }
      const comp = await compRes.json();
      router.push(`/competitions/${comp.id}/live?wallet=${encodeURIComponent(walletAddress ?? '')}`);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

      {/* ── Opponent roster ── */}
      <div>
        <h2 className="mb-3 text-[10px] font-mono uppercase tracking-widest text-[#464752]">
          Select Opponent
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => { setOpponentId(agent.id === opponentId ? null : agent.id); setError(null); }}
              className={`overflow-hidden border p-4 text-left transition-all ${
                opponentId === agent.id
                  ? 'border-[#ff6c92] bg-[#ff6c92]/10'
                  : 'border-[#464752]/20 bg-[#11131d] hover:bg-[#171924]'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="h-9 w-9 shrink-0 flex items-center justify-center font-['Bebas_Neue'] text-base"
                  style={{ background: `${agent.color}22`, border: `1px solid ${agent.color}66`, color: agent.color }}
                >
                  {agent.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-['Space_Grotesk'] font-bold uppercase text-[#eeecfa]">
                    {agent.name}
                  </div>
                  <div className="text-[10px] font-mono uppercase text-[#464752]">{agent.archetype}</div>
                </div>
                {agent.winRate && (
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm text-[#8ff5ff]">{agent.winRate}</div>
                    <div className="text-[9px] font-mono text-[#464752]">WIN</div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {agent.traits.slice(0, 2).map(t => (
                  <span
                    key={t}
                    className="border border-[#464752]/30 px-2 py-0.5 text-[9px] font-mono uppercase text-[#464752]"
                  >
                    {t}
                  </span>
                ))}
                <span className={`border px-2 py-0.5 text-[9px] font-mono uppercase ml-auto ${
                  agent.risk === 'Aggressive' ? 'border-[#ff6c92]/30 text-[#ff6c92]'
                  : agent.risk === 'Moderate' ? 'border-[#ffe6aa]/30 text-[#ffe6aa]'
                  : 'border-[#8ff5ff]/30 text-[#8ff5ff]'
                }`}>
                  {agent.risk}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Challenge config panel ── */}
      <div className="flex flex-col gap-4">

        {/* Opponent */}
        <div className="bg-[#11131d] border border-[#464752]/20 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-2">Opponent</div>
          {opponent ? (
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 flex items-center justify-center font-['Bebas_Neue'] text-lg shrink-0"
                style={{ background: `${opponent.color}22`, border: `1px solid ${opponent.color}`, color: opponent.color }}
              >
                {opponent.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-['Space_Grotesk'] font-bold text-sm uppercase text-[#eeecfa]">{opponent.name}</div>
                <div className="text-[10px] font-mono text-[#464752] uppercase">{opponent.archetype} · {opponent.risk}</div>
              </div>
            </div>
          ) : (
            <p className="text-xs font-mono text-[#464752]">← Select from roster</p>
          )}
        </div>

        {/* My Fighter — shows your agents first, then all agents as fallback */}
        <div className="bg-[#11131d] border border-[#464752]/20 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-2">
            Your Fighter
            {ready && !connected && <span className="ml-2 text-[#ff6c92]">— Connect wallet to use your agent</span>}
            {!ready && <span className="ml-2 text-[#464752]">— loading…</span>}
          </div>
          {/* Combine: your agents first, then remaining public agents */}
          {(() => {
            const myIds = new Set(myAgents.map(a => a.id));
            const allFighters = [
              ...myAgents,
              ...agents.filter(a => !myIds.has(a.id)),
            ];
            return allFighters.length > 0 ? (
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {allFighters.map(a => {
                  const isOwn = myIds.has(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => { setMyAgentId(a.id); setError(null); }}
                      className={`w-full flex items-center gap-2 p-2 border text-left transition-all ${
                        myAgentId === a.id
                          ? 'border-[#8ff5ff] bg-[#8ff5ff]/10'
                          : 'border-[#464752]/20 hover:bg-[#171924]'
                      }`}
                    >
                      <div
                        className="h-8 w-8 flex items-center justify-center font-['Bebas_Neue'] text-sm shrink-0"
                        style={{ background: `${a.color}22`, border: `1px solid ${a.color}66`, color: a.color }}
                      >
                        {a.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-['Space_Grotesk'] font-bold text-xs uppercase text-[#eeecfa]">{a.name}</div>
                        <div className="text-[9px] font-mono uppercase text-[#464752]">
                          {a.archetype}
                          {isOwn && <span className="ml-1 text-[#8ff5ff]">★ YOURS</span>}
                        </div>
                      </div>
                      {myAgentId === a.id && (
                        <span className="ml-auto text-[9px] font-mono text-[#8ff5ff] border border-[#8ff5ff]/30 px-1.5 py-0.5">SELECTED</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-[#464752]">No agents found. Build one first.</p>
                <a
                  href="/agents/create"
                  className="block w-full text-center bg-[#8ff5ff] text-[#003d42] px-4 py-2 font-['Space_Grotesk'] font-black text-xs uppercase hover:skew-x-[-6deg] transition-all"
                >
                  Build_Fighter →
                </a>
              </div>
            );
          })()}
        </div>

        {/* ── Strategy Panel ── */}
        {myAgentId && (
          <div className="bg-[#11131d] border border-[#8ff5ff]/20 p-4 space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#8ff5ff]">
              Pre-Match Strategy
            </div>

            {/* Gameplan */}
            <div>
              <div className="text-[9px] font-mono uppercase text-[#464752] mb-1.5">Game Plan</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['aggressive', 'defensive', 'counter-attack', 'balanced'] as const).map(gp => (
                  <button
                    key={gp}
                    onClick={() => setStrategy(s => ({ ...s, gameplan: gp }))}
                    className={`px-2 py-1.5 text-[9px] font-mono uppercase border transition-all ${
                      strategy.gameplan === gp
                        ? 'border-[#8ff5ff] bg-[#8ff5ff]/15 text-[#8ff5ff]'
                        : 'border-[#464752]/30 text-[#464752] hover:text-[#aaabb6]'
                    }`}
                  >
                    {gp === 'counter-attack' ? 'Counter' : gp}
                  </button>
                ))}
              </div>
            </div>

            {/* Shot Emphasis */}
            <div>
              <div className="text-[9px] font-mono uppercase text-[#464752] mb-1.5">Shot Emphasis</div>
              <div className="grid grid-cols-4 gap-1.5">
                {Object.keys(SHOT_PRESETS).map(preset => (
                  <button
                    key={preset}
                    onClick={() => setShotPreset(preset)}
                    className={`px-2 py-1.5 text-[9px] font-mono uppercase border transition-all ${
                      shotPreset === preset
                        ? 'border-[#ff6c92] bg-[#ff6c92]/15 text-[#ff6c92]'
                        : 'border-[#464752]/30 text-[#464752] hover:text-[#aaabb6]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Zones — 3x3 grid */}
            <div>
              <div className="text-[9px] font-mono uppercase text-[#464752] mb-1.5">
                Target Zones {zones.length > 0 && <span className="text-[#8ff5ff]">({zones.length} selected)</span>}
              </div>
              <div className="grid grid-cols-3 gap-1 w-fit">
                {[1,2,3,4,5,6,7,8,9].map(z => {
                  const labels = ['','Deep L','Deep C','Deep R','Mid L','Center','Mid R','Net L','Net C','Net R'];
                  const active = zones.includes(z);
                  return (
                    <button
                      key={z}
                      onClick={() => setZones(zs => active ? zs.filter(x => x !== z) : [...zs, z])}
                      className={`w-14 h-8 text-[8px] font-mono uppercase border transition-all ${
                        active
                          ? 'border-[#ffe6aa] bg-[#ffe6aa]/15 text-[#ffe6aa]'
                          : 'border-[#464752]/20 text-[#464752]/60 hover:text-[#464752]'
                      }`}
                    >
                      {labels[z]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Timing */}
            <div>
              <div className="text-[9px] font-mono uppercase text-[#464752] mb-1.5">Special Moves</div>
              <div className="flex gap-1.5">
                {(['early', 'late', 'never'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setStrategy(s => ({ ...s, specialTiming: t }))}
                    className={`flex-1 px-2 py-1.5 text-[9px] font-mono uppercase border transition-all ${
                      strategy.specialTiming === t
                        ? 'border-[#ffe6aa] bg-[#ffe6aa]/15 text-[#ffe6aa]'
                        : 'border-[#464752]/30 text-[#464752] hover:text-[#aaabb6]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Instructions */}
            <div>
              <div className="text-[9px] font-mono uppercase text-[#464752] mb-1.5">Tactical Notes <span className="text-[#464752]/50">(optional)</span></div>
              <textarea
                maxLength={200}
                rows={2}
                placeholder="e.g. Exploit opponent's weak backhand, target deep corners..."
                value={strategy.customInstructions ?? ''}
                onChange={e => setStrategy(s => ({ ...s, customInstructions: e.target.value || undefined }))}
                className="w-full bg-[#0c0e16] border border-[#464752]/20 px-2 py-1.5 text-[10px] font-mono text-[#eeecfa] placeholder:text-[#464752]/50 resize-none focus:border-[#8ff5ff]/30 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Sport — badminton only */}
        <div className="bg-[#11131d] border border-[#ffe6aa]/30 p-4 flex items-center gap-3">
          <span className="text-2xl">🏸</span>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752]">Sport</div>
            <div className="text-sm font-['Space_Grotesk'] font-bold uppercase text-[#ffe6aa]">Badminton</div>
          </div>
          <span className="ml-auto text-[9px] font-mono text-[#ffe6aa] border border-[#ffe6aa]/30 px-2 py-0.5">ACTIVE</span>
        </div>

        {/* Match details */}
        <div className="grid grid-cols-2 gap-2">
          {[['Format','1v1'],['Duration','5 min'],['Entry','FREE'],['Prize','$1 USDC']].map(([l,v]) => (
            <div key={l} className="bg-[#11131d] border border-[#464752]/20 px-3 py-2">
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">{l}</div>
              <div className="mt-0.5 text-xs font-['Space_Grotesk'] font-bold uppercase text-[#eeecfa]">{v}</div>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs font-mono text-[#ff6c92] border border-[#ff6c92]/20 bg-[#ff6c92]/05 px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleChallenge}
          disabled={!opponentId || !myAgentId || loading}
          className="w-full bg-[#ff6c92] text-[#48001b] px-6 py-4 font-['Space_Grotesk'] font-black uppercase text-sm hover:skew-x-[-6deg] transition-all disabled:opacity-40 disabled:hover:skew-x-0 disabled:cursor-not-allowed"
        >
          {loading ? 'Launching_Match…' : '⚔ Issue_Challenge →'}
        </button>
      </div>

    </div>
  );
}
