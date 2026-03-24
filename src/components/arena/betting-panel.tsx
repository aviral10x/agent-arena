"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import useSWR from "swr";
import dynamic from "next/dynamic";

const ConnectButtonSafe = dynamic(
  () => import("./connect-button-safe"),
  { ssr: false, loading: () => <div className="h-9 w-28 rounded-full bg-white/10 animate-pulse" /> }
);

interface BettingAgent {
  id: string;
  name: string;
  color: string;
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

const PRESET_AMOUNTS = [1, 5, 10];

export function BettingPanel({
  competitionId,
  agents,
  bettingOpen: initialBettingOpen,
  totalBetUsdc: initialTotal,
  winnerId,
  status,
}: BettingPanelProps) {
  const { address, isConnected } = useAccount();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(5);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedBet, setPlacedBet] = useState<{ agentId: string; amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: oddsData } = useSWR<OddsData>(
    `/api/competitions/${competitionId}/odds`,
    fetcher,
    { refreshInterval: 5000, fallbackData: { totalBetUsdc: initialTotal, bettingOpen: initialBettingOpen, bettingClosedAt: null, odds: [] } }
  );

  const bettingOpen = oddsData?.bettingOpen ?? initialBettingOpen;
  const totalBet = oddsData?.totalBetUsdc ?? initialTotal;
  const isSettled = status === "settled";

  const getOdds = (agentId: string) => {
    const entry = oddsData?.odds.find((o) => o.agentId === agentId);
    if (!entry || totalBet === 0) return { pct: 50, impliedOdds: "N/A" };
    return { pct: Math.round(entry.percentage), impliedOdds: entry.impliedOdds };
  };

  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : amount;

  const placeBet = useCallback(async () => {
    if (!selectedAgent || !address || effectiveAmount <= 0) return;
    setIsPlacing(true);
    setError(null);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betterWallet: address,
          predictedWinnerId: selectedAgent,
          amountUsdc: effectiveAmount,
          payload: {
            txSignature: `demo_sig_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            walletAddress: address,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Bet failed");
      } else {
        setPlacedBet({ agentId: selectedAgent, amount: effectiveAmount });
      }
    } catch (e: any) {
      setError(e.message ?? "Network error");
    } finally {
      setIsPlacing(false);
    }
  }, [selectedAgent, address, effectiveAmount, competitionId]);

  // Resolved state
  const userWon = placedBet && winnerId && placedBet.agentId === winnerId;
  const winnerAgent = agents.find((a) => a.id === winnerId);

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 space-y-4">
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
        {totalBet > 0 && (
          <div className="rounded-full border border-[var(--cyan)]/20 bg-[var(--cyan)]/10 px-3 py-1 text-xs font-semibold text-[var(--cyan)]">
            ${totalBet.toFixed(0)} pool
          </div>
        )}
      </div>

      {/* Settled result */}
      {isSettled && winnerId && (
        <div
          className="rounded-[1.2rem] border p-4 text-sm"
          style={{
            borderColor: (placedBet ? (userWon ? "#22c55e" : "#ef4444") : "#ffffff20"),
            background: (placedBet ? (userWon ? "#22c55e10" : "#ef444410") : "#ffffff08"),
          }}
        >
          {placedBet ? (
            userWon ? (
              <span className="text-green-400 font-semibold">
                🎉 You won! Your bet on {agents.find(a => a.id === placedBet.agentId)?.name} paid off.
              </span>
            ) : (
              <span className="text-red-400">
                😔 {winnerAgent?.name ?? "The other agent"} won this one. Better luck next time.
              </span>
            )
          ) : (
            <span className="text-[var(--text-secondary)]">
              🏆 {winnerAgent?.name ?? "Winner decided"} won this competition.
            </span>
          )}
        </div>
      )}

      {/* Active betting UI */}
      {!isSettled && (
        <>
          {/* Agent selection */}
          <div className="grid grid-cols-2 gap-3">
            {agents.slice(0, 2).map((agent) => {
              const { pct, impliedOdds } = getOdds(agent.id);
              const isSelected = selectedAgent === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => bettingOpen && !placedBet && setSelectedAgent(agent.id)}
                  disabled={!bettingOpen || !!placedBet}
                  className={`rounded-[1.2rem] border p-4 text-left transition active:scale-95 ${
                    isSelected
                      ? "border-opacity-100"
                      : "border-white/10 hover:border-white/20 hover:bg-white/5"
                  } ${!bettingOpen || placedBet ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                  style={isSelected ? { borderColor: agent.color, background: `${agent.color}12` } : undefined}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ background: agent.color, boxShadow: isSelected ? `0 0 8px ${agent.color}` : "none" }}
                    />
                    <span className="text-xs font-semibold text-white truncate">{agent.name}</span>
                  </div>
                  <div className="text-2xl font-black" style={{ color: agent.color }}>{pct}%</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {totalBet > 0 && impliedOdds !== 'N/Ax' ? `${impliedOdds} return` : "No bets yet"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Placed bet indicator */}
          {placedBet && (
            <div className="rounded-[1rem] border border-[var(--cyan)]/30 bg-[var(--cyan)]/10 px-4 py-3 text-sm">
              <span className="text-[var(--cyan)] font-semibold">
                ✓ Bet placed: ${placedBet.amount} on {agents.find(a => a.id === placedBet.agentId)?.name}
              </span>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                Odds: {getOdds(placedBet.agentId).impliedOdds} · Payout if correct
              </div>
            </div>
          )}

          {/* Amount selector — only show if no bet placed + wallet connected + betting open */}
          {!placedBet && bettingOpen && isConnected && (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Amount (USDC)</div>
                <div className="flex gap-2">
                  {PRESET_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => { setAmount(a); setCustomAmount(""); }}
                      className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                        amount === a && !customAmount
                          ? "bg-[var(--cyan)] text-black"
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
                    className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--cyan)]/50 focus:outline-none"
                    min="0.1"
                    step="0.1"
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
                className={`w-full rounded-full py-3 text-sm font-semibold transition active:scale-95 ${
                  selectedAgent && effectiveAmount > 0
                    ? "bg-[var(--cyan)] text-black hover:opacity-90"
                    : "border border-white/10 text-[var(--text-muted)] cursor-not-allowed"
                }`}
              >
                {isPlacing
                  ? "Placing bet…"
                  : selectedAgent
                  ? `Bet $${effectiveAmount} on ${agents.find(a => a.id === selectedAgent)?.name}`
                  : "Select an agent to bet"}
              </button>
            </>
          )}

          {/* Not connected */}
          {!isConnected && bettingOpen && (
            <div className="text-center space-y-2">
              <p className="text-xs text-[var(--text-muted)]">Connect wallet to place a bet</p>
              <ConnectButtonSafe />
            </div>
          )}

          {/* Betting closed but not settled */}
          {!bettingOpen && !isSettled && (
            <div className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-xs text-[var(--text-muted)] text-center">
              Betting window has closed · Waiting for result
            </div>
          )}
        </>
      )}
    </div>
  );
}
