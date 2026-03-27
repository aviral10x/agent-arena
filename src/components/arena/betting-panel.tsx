"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@/hooks/use-wallet";
import useSWR from "swr";

// USDC on X Layer (chain 196)
const USDC_ADDRESS = '0x74b7f16337b8972027f6196a17a631ac6de26d22' as const;

interface BettingAgent {
  id: string;
  name: string;
  color: string;
  ownerWallet?: string | null; // wallet that owns this agent
}

interface BettingPanelProps {
  competitionId: string;
  agents: BettingAgent[];
  bettingOpen: boolean;
  totalBetUsdc: number;
  winnerId?: string | null;
  status: string;
}

interface OddsData {
  totalBetUsdc: number;
  bettingOpen: boolean;
  bettingClosedAt: string | null;
  odds: { agentId: string; name: string; amountBet: number; percentage: number; impliedOdds: string }[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const PRESET_AMOUNTS = [0.10, 0.50, 1];

export function BettingPanel({
  competitionId,
  agents,
  bettingOpen: initialBettingOpen,
  totalBetUsdc: initialTotal,
  winnerId,
  status,
}: BettingPanelProps) {
  const { address, connected: isConnected, chainId, connect, signX402Payment } = useWallet();
  const chain = chainId ? { id: chainId } : null;

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0.10);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedBet, setPlacedBet] = useState<{ agentId: string; amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: oddsData } = useSWR<OddsData>(
    `/api/competitions/${competitionId}/odds`,
    fetcher,
    {
      refreshInterval: 5000,
      fallbackData: {
        totalBetUsdc: initialTotal,
        bettingOpen: initialBettingOpen,
        bettingClosedAt: null,
        odds: [],
      },
    }
  );

  const bettingOpen = oddsData?.bettingOpen ?? initialBettingOpen;
  const totalBet    = oddsData?.totalBetUsdc ?? initialTotal;
  const isSettled   = status === "settled";

  const getOdds = (agentId: string) => {
    const entry = oddsData?.odds.find((o) => o.agentId === agentId);
    if (!entry || totalBet === 0) return { pct: 50, impliedOdds: null };
    return { pct: Math.round(entry.percentage), impliedOdds: entry.impliedOdds === 'N/Ax' ? null : entry.impliedOdds };
  };

  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : amount;
  const isWrongChain = isConnected && chain?.id !== 196;

  // ── EIP-3009 sign + submit ────────────────────────────────────────────
  const placeBet = useCallback(async () => {
    if (!selectedAgent || !address || effectiveAmount <= 0) return;
    setIsPlacing(true);
    setError(null);

    try {
      const arenaReceiver = (process.env.NEXT_PUBLIC_ARENA_WALLET ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;
      const amountMicro   = BigInt(Math.round(effectiveAmount * 1_000_000));
      const nonce         = crypto.randomUUID().replace(/-/g, '');
      const validBefore   = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 min

      // Sign x402 payment via connected wallet
      let payload: Record<string, unknown>;
      const x402 = await signX402Payment(effectiveAmount);
      if (x402) {
        payload = x402;
      } else {
        // Demo/fallback path
        payload = {
          txSignature: `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          walletAddress: address ?? 'unknown',
        };
      }

      const res = await fetch(`/api/competitions/${competitionId}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          betterWallet: address,
          predictedWinnerId: selectedAgent,
          amountUsdc: effectiveAmount,
          payload,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Bet failed');
      } else {
        setPlacedBet({ agentId: selectedAgent, amount: effectiveAmount });
      }
    } catch (e: any) {
      // User rejected signature
      if (e.code === 4001 || e.message?.includes('rejected')) {
        setError('Signature rejected — bet cancelled.');
      } else {
        setError(e.message ?? 'Unexpected error');
      }
    } finally {
      setIsPlacing(false);
    }
  }, [selectedAgent, address, effectiveAmount, competitionId, signX402Payment]);

  const winnerAgent = agents.find((a) => a.id === winnerId);
  const userWon = placedBet && winnerId && placedBet.agentId === winnerId;

  // ── Player detection ──────────────────────────────────────────────────────
  // If connected wallet owns one of the competing agents → spectator betting is hidden,
  // only the odds chart is shown (Polymarket-style — see everything, bet nothing)
  const isPlayer = isConnected && address &&
    agents.some(a => a.ownerWallet?.toLowerCase() === address.toLowerCase());
  const playerAgent = isPlayer
    ? agents.find(a => a.ownerWallet?.toLowerCase() === address?.toLowerCase())
    : null;

  // ── Claim flow ────────────────────────────────────────────────────────────
  const [claimable, setClaimable] = useState<{ id: string; payout: number; competitionTitle: string }[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimDone, setClaimDone] = useState(false);

  useEffect(() => {
    if (!isSettled || !address) return;
    fetch(`/api/bets/claim?wallet=${address}`)
      .then(r => r.json())
      .then(data => {
        const forThis = (data.claimable ?? []).filter(
          (c: any) => c.competitionId === competitionId
        );
        setClaimable(forThis);
      })
      .catch(() => {});
  }, [isSettled, address, competitionId]);

  const handleClaim = useCallback(async (betId: string) => {
    if (!address) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/bets/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betId, walletAddress: address }),
      });
      if (res.ok) {
        setClaimDone(true);
        setClaimable(prev => prev.filter(c => c.id !== betId));
      }
    } catch {}
    finally { setClaiming(false); }
  }, [address]);

  // ── Polymarket-style odds chart (shown to everyone) ──────────────────────
  const OddsChart = () => (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Odds
        </span>
        {totalBet > 0 && (
          <span className="text-[10px] font-mono text-[var(--teal)]">
            ${totalBet.toFixed(2)} pool
          </span>
        )}
      </div>

      {/* Bar chart — one row per agent */}
      {agents.slice(0, 2).map((agent) => {
        const { pct, impliedOdds } = getOdds(agent.id);
        return (
          <div key={agent.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: agent.color }} />
                <span className="truncate text-white font-medium">{agent.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {impliedOdds && impliedOdds !== 'N/Ax' && (
                  <span className="text-[10px] text-[var(--text-muted)]">{impliedOdds} payout</span>
                )}
                <span className="font-mono font-bold" style={{ color: agent.color }}>{pct}%</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: agent.color, opacity: 0.85 }}
              />
            </div>
          </div>
        );
      })}

      {/* No bets yet */}
      {totalBet === 0 && (
        <p className="text-center text-[10px] text-[var(--text-muted)]">
          No bets placed yet — odds show 50/50
        </p>
      )}
    </div>
  );

  // ── Player view — odds only, no bet form ─────────────────────────────────
  if (isPlayer) {
    return (
      <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Market Sentiment
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              You're competing — spectators are betting on this match
            </div>
          </div>
          {playerAgent && (
            <div className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
              style={{ borderColor: `${playerAgent.color}40`, color: playerAgent.color, background: `${playerAgent.color}12` }}>
              Playing as {playerAgent.name}
            </div>
          )}
        </div>

        {/* Odds chart */}
        <OddsChart />

        {/* Info banner */}
        <div className="rounded-[1rem] border border-[var(--gold)]/20 bg-[var(--gold)]/5 px-3 py-2.5 text-xs text-[var(--gold)]">
          ⚡ Players can't bet on their own match — stay focused on winning.
          Spectators are watching and wagering.
        </div>

        {/* Pool total */}
        {totalBet > 0 && (
          <div className="text-center text-[11px] text-[var(--text-muted)]">
            <span className="text-white font-semibold">${totalBet.toFixed(2)} USDC</span> wagered by spectators
          </div>
        )}
      </div>
    );
  }

  // ── Spectator view — full betting UI ─────────────────────────────────────
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Spectator Betting
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {isSettled
              ? "Competition settled"
              : bettingOpen
              ? "Who wins this bout?"
              : "Betting closed"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalBet > 0 && (
            <div className="rounded-full border border-[var(--teal)]/20 bg-[var(--teal)]/10 px-2.5 sm:px-3 py-1 text-xs font-semibold text-[var(--teal)]">
              ${totalBet.toFixed(0)} pool
            </div>
          )}
          {/* Chain badge */}
          {isConnected && (
            <div className={`rounded-full px-2 py-1 text-[10px] font-semibold border ${
              chain?.id === 196
                ? "border-green-500/20 bg-green-500/10 text-green-400"
                : "border-amber-500/20 bg-amber-500/10 text-amber-400"
            }`}>
              {chain?.id === 196 ? "X Layer ✓" : `Wrong chain`}
            </div>
          )}
        </div>
      </div>

      {/* Wrong chain warning */}
      {isWrongChain && (
        <div className="rounded-[1rem] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          ⚠ Switch to <strong>X Layer (Chain 196)</strong> to place a real bet. Demo mode active.
        </div>
      )}

      {/* Settled result */}
      {isSettled && winnerId && (
        <div
          className="rounded-[1.2rem] border p-3 text-sm sm:p-4"
          style={{
            borderColor: placedBet ? (userWon ? "#22c55e40" : "#ef444440") : "#ffffff20",
            background:  placedBet ? (userWon ? "#22c55e10" : "#ef444410") : "#ffffff06",
          }}
        >
          {placedBet ? (
            userWon ? (
              <div>
                <span className="text-green-400 font-semibold">
                  🎉 You won! Your bet on {agents.find(a => a.id === placedBet.agentId)?.name} paid off.
                </span>
                {/* Claim button */}
                {claimable.length > 0 && !claimDone && (
                  <div className="mt-3">
                    {claimable.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleClaim(c.id)}
                        disabled={claiming}
                        className="w-full rounded-full bg-[var(--green)] py-2.5 text-sm font-bold text-black transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
                      >
                        {claiming ? 'Claiming…' : `Claim $${c.payout.toFixed(2)} USDC`}
                      </button>
                    ))}
                  </div>
                )}
                {claimDone && (
                  <p className="mt-2 text-xs text-green-400">✓ Payout claimed successfully</p>
                )}
              </div>
            ) : (
              <span className="text-red-400">
                😔 {winnerAgent?.name ?? "The other agent"} won. Better luck next time.
              </span>
            )
          ) : (
            <span className="text-[var(--text-secondary)]">
              🏆 {winnerAgent?.name ?? "Winner decided"} won this competition.
            </span>
          )}
        </div>
      )}

      {/* Always show odds chart for spectators */}
      <OddsChart />

      {/* Active betting UI */}
      {!isSettled && (
        <>
          {/* Agent selection cards — pick who to bet on */}
          <div className="grid grid-cols-2 gap-3">
            {agents.slice(0, 2).map((agent) => {
              const { pct, impliedOdds } = getOdds(agent.id);
              const isSelected = selectedAgent === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => bettingOpen && !placedBet && setSelectedAgent(agent.id)}
                  disabled={!bettingOpen || !!placedBet}
                  className={`rounded-[1.2rem] border p-3 sm:p-4 text-left transition active:scale-[0.98] ${
                    isSelected ? "" : "border-white/10 hover:border-white/20 hover:bg-white/5"
                  } ${!bettingOpen || placedBet ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                  style={isSelected ? { borderColor: agent.color, background: `${agent.color}12` } : undefined}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ background: agent.color, boxShadow: isSelected ? `0 0 8px ${agent.color}` : "none" }}
                    />
                    <span className="text-xs font-semibold text-white truncate">{agent.name}</span>
                  </div>
                  {/* Payout multiplier — key info for bettor */}
                  <div className="text-[10px] text-[var(--text-muted)] mb-1">Potential payout</div>
                  <div className="text-base sm:text-lg font-black" style={{ color: agent.color }}>
                    {impliedOdds && impliedOdds !== 'N/Ax' ? impliedOdds : '—'}
                  </div>
                  <div className={`mt-2 text-[9px] font-semibold uppercase tracking-widest ${isSelected ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                    {isSelected ? '✓ Selected' : 'Bet on this'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Placed bet confirmation */}
          {placedBet && (
            <div className="rounded-[1rem] border border-[var(--teal)]/30 bg-[var(--teal)]/10 px-3 py-2.5 sm:px-4 sm:py-3 text-sm">
              <span className="text-[var(--teal)] font-semibold">
                ✓ Bet placed: ${placedBet.amount} on {agents.find(a => a.id === placedBet.agentId)?.name}
              </span>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                Odds: {getOdds(placedBet.agentId).impliedOdds ?? 'Live'} · Payout if correct
              </div>
            </div>
          )}

          {/* Amount + submit — only when no bet placed, betting open, connected */}
          {!placedBet && bettingOpen && isConnected && (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Amount (USDC){chain?.id !== 196 ? " · Demo mode" : ""}
                </div>
                <div className="flex gap-2">
                  {PRESET_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => { setAmount(a); setCustomAmount(""); }}
                      className={`flex-1 rounded-full py-2 min-h-[44px] text-sm font-semibold transition ${
                        amount === a && !customAmount
                          ? "bg-[var(--teal)] text-black"
                          : "border border-white/10 text-white hover:bg-white/5"
                      }`}
                    >
                      ${a}
                    </button>
                  ))}
                  <input
                    type="number"
                    placeholder="Custom"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--teal)]/50 focus:outline-none"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-[1rem] border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={placeBet}
                disabled={!selectedAgent || isPlacing || effectiveAmount <= 0}
                className={`w-full rounded-full py-3 min-h-[44px] text-sm font-semibold transition active:scale-[0.98] ${
                  selectedAgent && effectiveAmount > 0
                    ? "bg-[var(--teal)] text-black hover:opacity-90"
                    : "border border-white/10 text-[var(--text-muted)] cursor-not-allowed"
                }`}
              >
                {isPlacing
                  ? "Signing & placing…"
                  : selectedAgent
                  ? `Bet $${effectiveAmount} on ${agents.find(a => a.id === selectedAgent)?.name}`
                  : "Select an agent to bet"}
              </button>

              {/* Chain hint */}
              {chain?.id === 196 ? (
                <p className="text-center text-[10px] text-[var(--text-muted)]">
                  Real USDC · EIP-3009 signed · X Layer on-chain
                </p>
              ) : (
                <p className="text-center text-[10px] text-amber-400/70">
                  Switch to X Layer for real USDC bets · Currently in demo mode
                </p>
              )}
            </>
          )}

          {/* Not connected */}
          {!isConnected && bettingOpen && (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-xs text-[var(--text-muted)]">Connect wallet to place a bet</p>
              <button
                onClick={connect}
                className="border border-[#8ff5ff]/30 px-4 py-2 text-sm font-mono uppercase text-[#8ff5ff] hover:bg-[#8ff5ff]/10 transition-colors rounded-full"
              >
                Connect Wallet
              </button>
            </div>
          )}

          {/* Betting closed, not settled */}
          {!bettingOpen && !isSettled && (
            <div className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-xs text-[var(--text-muted)] text-center">
              Betting window closed · Awaiting result
            </div>
          )}
        </>
      )}
    </div>
  );
}
