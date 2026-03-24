"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { useSignTypedData } from "wagmi";
import useSWR from "swr";
import dynamic from "next/dynamic";

const ConnectButtonSafe = dynamic(
  () => import("./connect-button-safe"),
  { ssr: false, loading: () => <div className="h-9 w-28 rounded-full bg-white/10 animate-pulse" /> }
);

// USDC on X Layer (chain 196)
const USDC_ADDRESS = '0x74b7f16337b8972027f6196a17a631ac6de26d22' as const;

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
  const { address, isConnected, chain } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(5);
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

      // Attempt real EIP-3009 signature if on X Layer
      let payload: Record<string, unknown>;

      if (isConnected && chain?.id === 196) {
        // Real on-chain path — sign TransferWithAuthorization
        const domain = {
          name: 'USD Coin',
          version: '2',
          chainId: 196,
          verifyingContract: USDC_ADDRESS,
        } as const;

        const types = {
          TransferWithAuthorization: [
            { name: 'from',        type: 'address' },
            { name: 'to',          type: 'address' },
            { name: 'value',       type: 'uint256' },
            { name: 'validAfter',  type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce',       type: 'bytes32' },
          ],
        } as const;

        const message = {
          from:        address,
          to:          arenaReceiver,
          value:       amountMicro,
          validAfter:  BigInt(0),
          validBefore,
          nonce:       `0x${nonce}` as `0x${string}`,
        };

        const signature = await signTypedDataAsync({
          domain,
          types,
          primaryType: 'TransferWithAuthorization',
          message,
        });

        payload = {
          signature,
          from:        address,
          to:          arenaReceiver,
          value:       amountMicro.toString(),
          validAfter:  '0',
          validBefore: validBefore.toString(),
          nonce:       `0x${nonce}`,
        };
      } else {
        // Demo/testnet path — skip signature, server accepts txSignature key
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
  }, [selectedAgent, address, effectiveAmount, competitionId, signTypedDataAsync, chain, isConnected]);

  const winnerAgent = agents.find((a) => a.id === winnerId);
  const userWon = placedBet && winnerId && placedBet.agentId === winnerId;

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
        <div className="flex items-center gap-2">
          {totalBet > 0 && (
            <div className="rounded-full border border-[var(--cyan)]/20 bg-[var(--cyan)]/10 px-3 py-1 text-xs font-semibold text-[var(--cyan)]">
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
          className="rounded-[1.2rem] border p-4 text-sm"
          style={{
            borderColor: placedBet ? (userWon ? "#22c55e40" : "#ef444440") : "#ffffff20",
            background:  placedBet ? (userWon ? "#22c55e10" : "#ef444410") : "#ffffff06",
          }}
        >
          {placedBet ? (
            userWon ? (
              <span className="text-green-400 font-semibold">
                🎉 You won! Your bet on {agents.find(a => a.id === placedBet.agentId)?.name} paid off.
              </span>
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

      {/* Active betting UI */}
      {!isSettled && (
        <>
          {/* Agent selection cards */}
          <div className="grid grid-cols-2 gap-3">
            {agents.slice(0, 2).map((agent) => {
              const { pct, impliedOdds } = getOdds(agent.id);
              const isSelected = selectedAgent === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => bettingOpen && !placedBet && setSelectedAgent(agent.id)}
                  disabled={!bettingOpen || !!placedBet}
                  className={`rounded-[1.2rem] border p-4 text-left transition active:scale-[0.98] ${
                    isSelected ? "" : "border-white/10 hover:border-white/20 hover:bg-white/5"
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
                  {impliedOdds && (
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{impliedOdds} payout</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Placed bet confirmation */}
          {placedBet && (
            <div className="rounded-[1rem] border border-[var(--cyan)]/30 bg-[var(--cyan)]/10 px-4 py-3 text-sm">
              <span className="text-[var(--cyan)] font-semibold">
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
                className={`w-full rounded-full py-3 text-sm font-semibold transition active:scale-[0.98] ${
                  selectedAgent && effectiveAmount > 0
                    ? "bg-[var(--cyan)] text-black hover:opacity-90"
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
              <ConnectButtonSafe />
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
