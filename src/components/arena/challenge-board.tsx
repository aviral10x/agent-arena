'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '@/hooks/use-wallet';

type AgentRow = {
  id: string; name: string; archetype: string; color: string;
  risk: string; winRate?: string; traits: string[]; competitions: any[];
};

// Only badminton is supported in this version
const SPORT = 'badminton';

export function ChallengeBoard({ agents }: { agents: AgentRow[] }) {
  const router        = useRouter();
  const params        = useSearchParams();
  const { ready, connected, address: walletAddress, connect, signX402Payment } = useWallet();

  const [opponentId,   setOpponentId]   = useState<string | null>(null);
  const [myAgentId,    setMyAgentId]    = useState<string>(params.get('myAgentId') ?? '');
  const [myAgents,     setMyAgents]     = useState<AgentRow[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [paymentStep,  setPaymentStep]  = useState<string | null>(null); // signing | verifying | null
  const [error,        setError]        = useState<string | null>(null);

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

  const ENTRY_FEE_USDC = 0.10;
  const USDC_ADDRESS   = '0x74b7f16337b8972027f6196a17a631ac6de26d22' as const;
  const ARENA_RECEIVER = (process.env.NEXT_PUBLIC_ARENA_WALLET ?? '0x991442af55370b91930c5617b472b0e468e97bb2') as `0x${string}`;

  const handleChallenge = async () => {
    if (!opponentId)  { setError('Select an opponent first.');          return; }
    if (!myAgentId)   { setError('Select or create your fighter first.'); return; }
    if (opponentId === myAgentId) { setError('Cannot challenge yourself — pick a different fighter or opponent.'); return; }
    setLoading(true); setError(null); setPaymentStep(null);

    let payload: any = null;

    // ── Step 1: Try x402 payment ($0.10 USDC entry fee) via wallet ──
    if (walletAddress) {
      try {
        setPaymentStep('signing');
        payload = await signX402Payment(ENTRY_FEE_USDC);
      } catch (signErr: any) {
        console.warn('[challenge] x402 sign failed, using demo mode:', signErr.message?.slice(0, 60));
        payload = null;
      }
    }

    // ── Step 2: Create competition ──
    try {
      setPaymentStep(payload ? 'verifying' : null);
      const compRes = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAgentId:     opponentId,
          challengerAgentId: myAgentId,
          type:              'sport',
          sport:             SPORT,
          ...(payload ? { payload } : {}),
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
      setPaymentStep(null);
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
          {[['Format','1v1'],['Duration','5 min'],['Entry','$0.10 x402'],['Prize','$1 USDC']].map(([l,v]) => (
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
          {paymentStep === 'signing' ? 'Sign $0.10 USDC Payment…'
            : paymentStep === 'verifying' ? 'Verifying Payment…'
            : loading ? 'Launching_Match…'
            : '⚔ Issue_Challenge · $0.10 →'}
        </button>
      </div>

    </div>
  );
}
