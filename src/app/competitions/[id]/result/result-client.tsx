"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AgentResult = {
  id: string;
  name: string;
  color: string;
  archetype: string;
  score: number;
  pnlPct: number;
  speed: number;
  power: number;
  stamina: number;
  accuracy: number;
} | null;

type Props = {
  competitionId: string;
  competitionTitle: string;
  agentA: AgentResult;
  agentB: AgentResult;
  winnerId: string | null;
  totalRallies: number;
  sport: string;
  status: string;
};

const SPORT_ICON: Record<string, string> = {
  badminton:    "🏸",
  tennis:       "🎾",
  "table-tennis": "🏓",
};

function StatRow({ label, aVal, bVal, aWin }: { label: string; aVal: string | number; bVal: string | number; aWin: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 border-b border-[#464752]/10 last:border-0">
      <div className={`text-right font-mono text-sm font-bold ${aWin ? "text-[#8ff5ff]" : "text-[#464752]"}`}>{aVal}</div>
      <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752] text-center w-24">{label}</div>
      <div className={`text-left font-mono text-sm font-bold ${!aWin ? "text-[#8ff5ff]" : "text-[#464752]"}`}>{bVal}</div>
    </div>
  );
}

type SettledBet = { id: string; betterWallet: string; predictedWinnerId: string; amountUsdc: number; txSignature: string; isCorrect: boolean | null; payoutUsdc: number; settledAt: string | null };

export function ResultClient({ competitionId, competitionTitle, agentA, agentB, winnerId: initialWinnerId, totalRallies, sport, status }: Props) {
  const [visible, setVisible] = useState(false);
  const [winnerId, setWinnerId] = useState(initialWinnerId);
  const [bets, setBets] = useState<SettledBet[]>([]);

  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);

  // Poll for winnerId if null (settlement may still be in progress)
  useEffect(() => {
    if (winnerId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/competitions/${competitionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.winnerId) { setWinnerId(data.winnerId); clearInterval(interval); }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [competitionId, winnerId]);

  // Fetch settled bets
  useEffect(() => {
    fetch(`/api/competitions/${competitionId}/bet`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setBets(data);
    }).catch(() => {});
  }, [competitionId]);

  const winner = agentA?.id === winnerId ? agentA : agentB?.id === winnerId ? agentB : null;
  const loser  = agentA?.id === winnerId ? agentB : agentB?.id === winnerId ? agentA : null;

  const isSettled = status === "settled";
  const sportIcon = SPORT_ICON[sport] ?? "🏸";

  return (
    <div
      className="min-h-screen bg-[#0c0e16] text-[#eeecfa] flex flex-col overflow-hidden"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease" }}
    >
      <div className="scanline fixed inset-0 z-10 opacity-10 pointer-events-none" />

      {/* Radial glow bg */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(143,245,255,0.06) 0%, transparent 70%)" }}
      />

      {/* ── Header ── */}
      <header className="shrink-0 h-12 bg-[#11131d] border-b border-[#8ff5ff]/20 flex items-center px-4 gap-4 z-50">
        <Link href="/challenges" className="text-[10px] font-mono uppercase tracking-widest text-[#464752] hover:text-[#aaaab6] transition-colors">
          ← Matchmaking
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#464752]">AGENT ARENA</span>
          <span className="text-[#464752]">//</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#8ff5ff]">POST_MATCH</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-8 max-w-4xl mx-auto w-full gap-6">

        {/* ── Victory Banner ── */}
        <div className="w-full text-center relative">
          {/* Horizontal rule */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-[#8ff5ff]/20" />
          <div className="relative inline-block bg-[#0c0e16] px-6">
            <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-[#464752] mb-1">Match Concluded</div>
            {winner ? (
              <div
                className="font-['Bebas_Neue'] text-5xl md:text-7xl tracking-wider"
                style={{ color: winner.color, textShadow: `0 0 40px ${winner.color}66` }}
              >
                VICTORY // {winner.name.toUpperCase()}
              </div>
            ) : (
              <div className="font-['Bebas_Neue'] text-5xl tracking-wider text-[#ffe6aa]">
                {isSettled ? "MATCH SETTLED" : "MATCH IN PROGRESS"}
              </div>
            )}
          </div>
        </div>

        {/* ── Score ── */}
        {agentA && agentB && (
          <div className="w-full bg-[#11131d] border border-[#464752]/20 p-6 relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(90deg, ${agentA.color}08 0%, transparent 40%, transparent 60%, ${agentB.color}08 100%)` }}
            />
            <div className="relative grid grid-cols-3 items-center gap-4">
              {/* Agent A */}
              <div className={`flex flex-col items-center gap-2 ${agentA.id === winnerId ? "opacity-100" : "opacity-60"}`}>
                <div
                  className="h-16 w-16 flex items-center justify-center font-['Bebas_Neue'] text-2xl border-2"
                  style={{ background: `${agentA.color}22`, borderColor: agentA.id === winnerId ? agentA.color : `${agentA.color}44`, color: agentA.color }}
                >
                  {agentA.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="font-['Space_Grotesk'] font-black text-sm uppercase text-center" style={{ color: agentA.color }}>
                  {agentA.name}
                </div>
                <div className="text-[9px] font-mono uppercase text-[#464752]">{agentA.archetype}</div>
                {agentA.id === winnerId && (
                  <span className="text-[9px] font-mono uppercase tracking-widest border border-[#8ff5ff]/30 bg-[#8ff5ff]/10 text-[#8ff5ff] px-2 py-0.5">
                    WINNER
                  </span>
                )}
              </div>

              {/* Score */}
              <div className="flex flex-col items-center gap-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-1">{sportIcon} {sport}</div>
                <div className="flex items-center gap-3">
                  <span
                    className="font-['Bebas_Neue'] text-6xl leading-none"
                    style={{ color: agentA.id === winnerId ? agentA.color : "#464752" }}
                  >
                    {agentA.score}
                  </span>
                  <span className="font-mono text-2xl text-[#464752]">—</span>
                  <span
                    className="font-['Bebas_Neue'] text-6xl leading-none"
                    style={{ color: agentB.id === winnerId ? agentB.color : "#464752" }}
                  >
                    {agentB.score}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[#464752] mt-2">{totalRallies} RALLIES</div>
              </div>

              {/* Agent B */}
              <div className={`flex flex-col items-center gap-2 ${agentB.id === winnerId ? "opacity-100" : "opacity-60"}`}>
                <div
                  className="h-16 w-16 flex items-center justify-center font-['Bebas_Neue'] text-2xl border-2"
                  style={{ background: `${agentB.color}22`, borderColor: agentB.id === winnerId ? agentB.color : `${agentB.color}44`, color: agentB.color }}
                >
                  {agentB.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="font-['Space_Grotesk'] font-black text-sm uppercase text-center" style={{ color: agentB.color }}>
                  {agentB.name}
                </div>
                <div className="text-[9px] font-mono uppercase text-[#464752]">{agentB.archetype}</div>
                {agentB.id === winnerId && (
                  <span className="text-[9px] font-mono uppercase tracking-widest border border-[#8ff5ff]/30 bg-[#8ff5ff]/10 text-[#8ff5ff] px-2 py-0.5">
                    WINNER
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Performance Analysis ── */}
        {agentA && agentB && (
          <div className="w-full bg-[#11131d] border border-[#464752]/20">
            <div className="border-b border-[#464752]/20 px-4 py-3 flex items-center gap-3">
              <div className="w-1 h-4 bg-[#8ff5ff]" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#aaaab6]">TEL_LOG // Performance Analysis</span>
            </div>
            <div className="px-4 py-3">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-1">
                <div className="text-right text-[9px] font-mono uppercase text-[#464752]">{agentA.name}</div>
                <div className="w-24" />
                <div className="text-left text-[9px] font-mono uppercase text-[#464752]">{agentB.name}</div>
              </div>
              <StatRow label="Speed"    aVal={agentA.speed}    bVal={agentB.speed}    aWin={agentA.speed    >= agentB.speed} />
              <StatRow label="Power"    aVal={agentA.power}    bVal={agentB.power}    aWin={agentA.power    >= agentB.power} />
              <StatRow label="Stamina"  aVal={agentA.stamina}  bVal={agentB.stamina}  aWin={agentA.stamina  >= agentB.stamina} />
              <StatRow label="Accuracy" aVal={agentA.accuracy} bVal={agentB.accuracy} aWin={agentA.accuracy >= agentB.accuracy} />
              <StatRow label="Score"    aVal={agentA.score}    bVal={agentB.score}    aWin={agentA.score    >= agentB.score} />
            </div>
          </div>
        )}

        {/* ── Winner rewards ── */}
        {winner && (
          <div className="w-full bg-[#11131d] border border-[#ffe6aa]/20 p-4 relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{ background: "radial-gradient(ellipse at 50% 0%, #ffe6aa 0%, transparent 70%)" }}
            />
            <div className="relative flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#ffe6aa]/60 mb-1">Mission Rewards</div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[#ffe6aa] text-lg">◈</span>
                    <span className="font-['Space_Grotesk'] font-black text-sm text-[#ffe6aa]">+$1 USDC</span>
                    <span className="text-[9px] font-mono text-[#ffe6aa]/60 uppercase">Prize Earned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#8ff5ff] text-lg">⬡</span>
                    <span className="font-['Space_Grotesk'] font-black text-sm text-[#8ff5ff]">+1 Win</span>
                    <span className="text-[9px] font-mono text-[#8ff5ff]/60 uppercase">Record Updated</span>
                  </div>
                </div>
              </div>
              <div className="text-[9px] font-mono text-[#464752] uppercase">
                TX_ID: {competitionId.slice(-8).toUpperCase()}
              </div>
            </div>
          </div>
        )}

        {/* ── Settled Bets ── */}
        {bets.length > 0 && (
          <div className="w-full bg-[#11131d] border border-[#464752]/20 p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-3">
              Settled Bets <span className="text-[#ffe6aa]">// {bets.length}</span>
            </div>
            <div className="space-y-1.5">
              {bets.map(bet => {
                const agentName = bet.predictedWinnerId === agentA?.id ? agentA?.name : agentB?.name;
                const agentColor = bet.predictedWinnerId === agentA?.id ? (agentA?.color ?? '#8ff5ff') : (agentB?.color ?? '#ff6c92');
                const wallet = bet.betterWallet.slice(0, 6) + '…' + bet.betterWallet.slice(-4);
                const xlayerUrl = `https://www.oklink.com/x-layer-testnet/tx/${bet.txSignature.startsWith('0x') ? bet.txSignature : ''}`;
                return (
                  <div key={bet.id} className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="text-[#464752]">{wallet}</span>
                    <span style={{ color: agentColor }} className="font-bold uppercase">{agentName}</span>
                    <span className="text-[#ffe6aa] font-bold">${bet.amountUsdc.toFixed(2)}</span>
                    {bet.settledAt ? (
                      bet.isCorrect ? (
                        <span className="text-[#00ff87] font-bold">WON ${bet.payoutUsdc.toFixed(2)}</span>
                      ) : (
                        <span className="text-[#ff6c92]">LOST</span>
                      )
                    ) : (
                      <span className="text-[#464752] animate-pulse">SETTLING…</span>
                    )}
                    <a href={xlayerUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-[#8ff5ff] hover:underline text-[9px]">
                      tx:{bet.txSignature.slice(0, 12)}…
                    </a>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[9px] font-mono text-[#464752] uppercase">
              Pool: ${bets.reduce((s, b) => s + b.amountUsdc, 0).toFixed(2)} USDC · Rake: 10%
            </div>
          </div>
        )}

        {/* ── CTAs ── */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/challenges"
            className="flex items-center justify-center gap-2 bg-[#ff6c92] text-[#48001b] px-6 py-4 font-['Space_Grotesk'] font-black uppercase text-sm hover:skew-x-[-6deg] transition-all text-center sm:col-span-1"
          >
            Rematch →
          </Link>
          <Link
            href={`/competitions/${competitionId}/cinematic`}
            className="flex items-center justify-center gap-2 border border-[#8ff5ff]/30 text-[#8ff5ff] px-6 py-4 font-mono text-xs uppercase tracking-widest hover:bg-[#8ff5ff]/10 transition-colors text-center"
          >
            ▶ View Cinematic
          </Link>
          <Link
            href="/leaderboard"
            className="flex items-center justify-center gap-2 border border-[#464752]/30 text-[#464752] px-6 py-4 font-mono text-xs uppercase tracking-widest hover:border-[#aaaab6]/30 hover:text-[#aaaab6] transition-colors text-center"
          >
            Rankings →
          </Link>
        </div>

      </main>
    </div>
  );
}
