'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type AgentRow = {
  id:           string;
  name:         string;
  archetype:    string;
  color:        string;
  risk:         string;
  winRate:      string;
  traits:       string[];
  competitions: any[];
};

export function ChallengeBoard({ agents }: { agents: AgentRow[] }) {
  const router = useRouter();
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [challengerName, setChallengerName] = useState('');

  const selected = agents.find(a => a.id === selectedId);

  const handleChallenge = async () => {
    if (!selectedId || !challengerName.trim()) {
      setError('Enter a name for your challenger agent.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Create the challenger agent
      const agentRes = await fetch('/api/agents', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        challengerName.trim(),
          archetype:   'Challenger',
          strategy:    'momentum',
          description: `Custom challenger agent`,
          traits:      ['Adaptive', 'Reactive'],
          risk:        'Moderate',
          color:       '#f59e0b',
          owner:       'Arena User',
        }),
      });
      if (!agentRes.ok) throw new Error('Failed to create challenger agent');
      const newAgent = await agentRes.json();

      // 2. Create a challenge competition pre-seeded with the target agent
      const compRes = await fetch('/api/challenges', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAgentId:     selectedId,
          challengerAgentId: newAgent.id,
        }),
      });
      if (!compRes.ok) throw new Error('Failed to create challenge');
      const comp = await compRes.json();

      router.push(`/competitions/${comp.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">

      {/* Agent roster */}
      <div>
        <h2 className="mb-4 text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
          Pick an opponent
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedId(agent.id === selectedId ? null : agent.id)}
              className={`rounded-[1.4rem] border p-4 text-left transition-all ${
                selectedId === agent.id
                  ? 'border-[var(--cyan)] bg-[var(--cyan-soft)]'
                  : 'border-white/10 bg-white/5 hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-9 w-9 shrink-0 rounded-full"
                  style={{ background: `radial-gradient(circle at 35% 35%, ${agent.color}cc, ${agent.color}44)` }}
                />
                <div>
                  <div className="text-sm font-semibold text-white">{agent.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{agent.archetype}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-mono text-sm text-white">{agent.winRate}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">win rate</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {agent.traits.slice(0, 3).map(t => (
                  <span key={t} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    {t}
                  </span>
                ))}
                <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                  agent.risk === 'Aggressive' ? 'border-[var(--red)]/30 text-[var(--red)]'
                  : agent.risk === 'Moderate' ? 'border-[var(--gold)]/30 text-[var(--gold)]'
                  : 'border-[var(--cyan)]/30 text-[var(--cyan)]'
                }`}>{agent.risk}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Challenge panel */}
      <div className="lg:sticky lg:top-8 space-y-4 self-start">
        <div className="glass-panel rounded-[1.6rem] p-6">
          <h2 className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)] mb-5">
            Configure challenge
          </h2>

          {/* Selected opponent */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-2">Opponent</div>
            {selected ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full shrink-0"
                  style={{ background: `radial-gradient(circle at 35% 35%, ${selected.color}cc, ${selected.color}44)` }} />
                <div>
                  <div className="text-sm font-semibold text-white">{selected.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{selected.archetype} · {selected.risk}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">← Select an agent from the roster</p>
            )}
          </div>

          {/* Challenger name */}
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 mb-4">
            <label className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] block mb-2">
              Your challenger name
            </label>
            <input
              type="text"
              value={challengerName}
              onChange={e => { setChallengerName(e.target.value); setError(null); }}
              placeholder="e.g. Alpha Prime"
              maxLength={40}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>

          {/* Match details */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {[
              ['Format',    '1v1 Arena'],
              ['Duration',  '1 hour'],
              ['Entry',     '$1 x402'],
              ['Prize',     '$10 USDC'],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{l}</div>
                <div className="mt-0.5 text-xs font-semibold text-white">{v}</div>
              </div>
            ))}
          </div>

          {error && (
            <p className="mb-3 text-xs text-[var(--red)]">{error}</p>
          )}

          <button
            onClick={handleChallenge}
            disabled={!selectedId || !challengerName.trim() || loading}
            className="w-full rounded-full bg-[var(--cyan)] py-3 text-sm font-semibold text-slate-950
              shadow-[0_10px_30px_rgba(102,227,255,0.25)] transition hover:-translate-y-0.5
              disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating match…' : '⚔️ Issue challenge'}
          </button>
        </div>
      </div>
    </div>
  );
}
