"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { playClick, playSelect, playSuccess, playError, playGenerate } from "@/lib/sfx";

// ─── Types ────────────────────────────────────────────────────────────────────

type Agent = {
  id: string;
  name: string;
  color: string;
  archetype: string;
  score: number;
  speed: number;
  power: number;
  stamina: number;
  accuracy: number;
  specialMoves: string[];
  avatarUrl: string | null;
};

type RecentBet = {
  id: string;
  wallet: string;
  predictedWinnerId: string;
  amountUsdc: number;
  paidAt: string;
};

type Props = {
  competitionId: string;
  competitionTitle: string;
  agentA: Agent | null;
  agentB: Agent | null;
  bettingOpen: boolean;
  winnerId: string | null;
  totalBetUsdc: number;
  status: string;
  sport: string;
  recentBets: RecentBet[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statTotal(a: Agent) {
  return a.speed + a.power + a.stamina + a.accuracy;
}

function winProbability(a: Agent, b: Agent): [number, number] {
  const ta = statTotal(a);
  const tb = statTotal(b);
  const total = ta + tb;
  return [ta / total, tb / total];
}

function multiplier(prob: number): number {
  // 90% payout pool (10% rake)
  return Math.round((1 / prob) * 0.9 * 100) / 100;
}

function shortWallet(w: string) {
  if (w.length < 10) return w;
  return `${w.slice(0, 6)}…${w.slice(-4)}`;
}

const SPORT_ICON: Record<string, string> = {
  badminton: "🏸",
  tennis: "🎾",
  "table-tennis": "🏓",
};

// ─── Scan Lines ───────────────────────────────────────────────────────────────

function ScanLines() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        background: "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.12) 50%)",
        backgroundSize: "100% 2px",
        opacity: 0.3,
      }}
    />
  );
}

// ─── Agent Combat Card ────────────────────────────────────────────────────────

function AgentCard({
  agent,
  isFavorite,
  winProb,
  mult,
  selected,
  bettingOpen,
  winnerId,
  onSelect,
}: {
  agent: Agent;
  isFavorite: boolean;
  winProb: number;
  mult: number;
  selected: boolean;
  bettingOpen: boolean;
  winnerId: string | null;
  onSelect: () => void;
}) {
  const cyan = "#00f0ff";
  const magenta = "#ff2d78";
  const accent = isFavorite ? cyan : magenta;
  const label = isFavorite ? "FAVORITE" : "UNDERDOG";
  const isWinner = winnerId === agent.id;
  const isLoser = winnerId !== null && winnerId !== agent.id;

  return (
    <div
      className={`relative overflow-hidden cursor-pointer transition-all duration-200 ${
        selected ? "ring-2" : "hover:brightness-110"
      } ${isLoser ? "opacity-40" : ""}`}
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(12px)",
        border: `1px solid rgba(255,255,255,0.1)`,
        boxShadow: selected
          ? `inset 0 1px 1px rgba(255,255,255,0.1), 0 0 20px ${accent}44`
          : "inset 0 1px 1px rgba(255,255,255,0.1)",
        borderLeft: isFavorite ? `4px solid ${accent}` : undefined,
        borderRight: !isFavorite ? `4px solid ${accent}` : undefined,
        outline: selected ? `2px solid ${accent}` : undefined,
        outlineOffset: "-2px",
      }}
      onClick={() => {
        if (!bettingOpen) return;
        playSelect();
        onSelect();
      }}
    >
      {/* Label badge */}
      <div className={`absolute top-4 ${isFavorite ? "right-4" : "left-4"} z-10`}>
        <span
          className="px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase"
          style={{ background: `${accent}22`, color: accent }}
        >
          {isWinner ? "WINNER" : isLoser ? "LOSER" : label}
        </span>
      </div>

      <div className={`p-8 ${!isFavorite ? "text-right" : ""}`}>
        {/* Avatar */}
        {agent.avatarUrl && (
          <div
            className="w-16 h-16 mb-4 overflow-hidden"
            style={{ border: `1px solid ${accent}44` }}
          >
            <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" />
          </div>
        )}

        <h2
          className="text-4xl font-black uppercase tracking-tight mb-1 leading-none"
          style={{
            fontFamily: "Rajdhani, sans-serif",
            color: "#ffffff",
            textShadow: selected ? `0 0 20px ${accent}66` : undefined,
          }}
        >
          {agent.name}
        </h2>
        <p className="text-xs font-mono text-white/40 mb-10 uppercase">
          TYPE: {agent.archetype.replace(/ /g, "_").toUpperCase()}
        </p>

        <div className={`flex justify-between items-end ${!isFavorite ? "flex-row-reverse" : ""}`}>
          <div>
            <div className="text-[10px] font-mono uppercase mb-1" style={{ color: `${accent}99` }}>
              Win Probability
            </div>
            <div
              className="text-5xl font-mono font-bold tracking-tighter leading-none"
              style={{ color: accent, fontFamily: "JetBrains Mono, monospace" }}
            >
              {(winProb * 100).toFixed(1)}%
            </div>
          </div>
          <div className={!isFavorite ? "text-left" : "text-right"}>
            <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Multiplier</div>
            <div
              className="text-3xl font-mono text-white"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {mult}x
            </div>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex gap-2 mt-6 flex-wrap">
          {[
            { label: "SPD", val: agent.speed },
            { label: "PWR", val: agent.power },
            { label: "STA", val: agent.stamina },
            { label: "ACC", val: agent.accuracy },
          ].map(({ label: l, val }) => (
            <div
              key={l}
              className="px-2 py-0.5 font-mono text-[9px]"
              style={{ background: `${accent}11`, color: `${accent}bb` }}
            >
              {l} {val}
            </div>
          ))}
        </div>

        {/* Special moves */}
        {agent.specialMoves.length > 0 && (
          <div className={`flex gap-2 mt-2 flex-wrap ${!isFavorite ? "justify-end" : ""}`}>
            {agent.specialMoves.slice(0, 2).map((m: string) => (
              <div
                key={m}
                className="px-2 py-0.5 font-mono text-[9px] uppercase"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
              >
                ⚡ {m}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hover bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 w-full"
        style={{ background: `${accent}22` }}
      >
        <div
          className="h-full transition-all duration-700"
          style={{
            width: selected ? "100%" : "0%",
            background: accent,
          }}
        />
      </div>
    </div>
  );
}

// ─── Stake Terminal ───────────────────────────────────────────────────────────

function StakeTerminal({
  selectedAgent,
  agentA,
  agentB,
  stakeAmount,
  onAmountChange,
  winProb,
  mult,
  bettingOpen,
  winnerId,
  onCommit,
  committing,
  committed,
  walletAddress,
}: {
  selectedAgent: string | null;
  agentA: Agent | null;
  agentB: Agent | null;
  stakeAmount: number;
  onAmountChange: (v: number) => void;
  winProb: number;
  mult: number;
  bettingOpen: boolean;
  winnerId: string | null;
  onCommit: () => void;
  committing: boolean;
  committed: boolean;
  walletAddress: string | null;
}) {
  const { ready, login } = usePrivy();
  const cyan = "#00f0ff";
  const magenta = "#ff2d78";
  const selected = selectedAgent
    ? selectedAgent === agentA?.id
      ? agentA
      : agentB
    : null;
  const accentColor = selected
    ? selected.id === agentA?.id
      ? cyan
      : magenta
    : cyan;

  const payout = Math.round(stakeAmount * mult * 100) / 100;
  const returnPct = Math.round((mult - 1) * 100);

  const isSettled = winnerId !== null;
  const canBet = bettingOpen && !isSettled && !committed;

  const presets = [1, 5, 10, 25];

  return (
    <div
      className="overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(12px)",
        border: `1px solid rgba(255,255,255,0.1)`,
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1)",
        borderTop: `2px solid ${cyan}`,
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* Amount Input */}
        <div
          className="md:col-span-4 p-8"
          style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          <label className="block font-mono text-[10px] uppercase tracking-widest mb-6" style={{ color: `${cyan}99` }}>
            Stake Amount (USDC)
          </label>
          <div className="relative group">
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-2xl"
              style={{ color: cyan, fontFamily: "JetBrains Mono, monospace" }}
            >
              $
            </span>
            <input
              type="number"
              min={1}
              step={1}
              value={stakeAmount}
              onChange={(e) => {
                onAmountChange(Math.max(1, Number(e.target.value)));
              }}
              disabled={!canBet}
              className="w-full bg-transparent border-none text-5xl font-mono text-white pl-7 focus:ring-0 placeholder:text-white/10"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                WebkitAppearance: "none",
                MozAppearance: "textfield",
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-full h-px transition-colors"
              style={{ background: canBet ? `${cyan}44` : "rgba(255,255,255,0.1)" }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 mt-8">
            {presets.map((p) => (
              <button
                key={p}
                disabled={!canBet}
                onClick={() => {
                  if (!canBet) return;
                  playClick();
                  onAmountChange(p);
                }}
                className="py-2 text-[10px] font-mono uppercase transition-all disabled:opacity-30"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.6)",
                }}
                onMouseEnter={(e) => {
                  if (!canBet) return;
                  (e.target as HTMLElement).style.background = `${cyan}22`;
                  (e.target as HTMLElement).style.color = cyan;
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  (e.target as HTMLElement).style.color = "rgba(255,255,255,0.6)";
                }}
              >
                ${p}
              </button>
            ))}
          </div>
        </div>

        {/* Payout */}
        <div
          className="md:col-span-4 p-8 flex flex-col justify-between"
          style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-6" style={{ color: `${cyan}99` }}>
              Implied Payout
            </label>
            <div
              className="text-5xl font-mono font-bold leading-none"
              style={{
                color: cyan,
                fontFamily: "JetBrains Mono, monospace",
                textShadow: `0 0 20px ${cyan}66`,
              }}
            >
              ${payout.toFixed(2)} <span className="text-xl font-normal">USDC</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] font-mono" style={{ color: `${cyan}99` }}>
                +{returnPct}% POTENTIAL RETURN
              </span>
            </div>
          </div>

          <div
            className="pt-6"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-white/40 uppercase">Betting On:</span>
              {selected ? (
                <span
                  className="font-black text-sm px-3 py-1 uppercase italic tracking-tighter"
                  style={{
                    fontFamily: "Rajdhani, sans-serif",
                    background: accentColor,
                    color: accentColor === cyan ? "#000" : "#fff",
                  }}
                >
                  {selected.name}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-white/20 uppercase">— Select Agent —</span>
              )}
            </div>
          </div>
        </div>

        {/* Commit Button */}
        <div className="md:col-span-4 p-8 flex">
          <button
            disabled={!canBet || !selectedAgent || committing}
            onClick={() => {
              if (!canBet || !selectedAgent) return;
              onCommit();
            }}
            className="group relative w-full overflow-hidden flex flex-col items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: committed ? `${cyan}22` : isSettled ? "rgba(255,255,255,0.05)" : magenta,
              boxShadow: committed
                ? `0 0 30px ${cyan}44`
                : canBet && selectedAgent
                ? `0 0 15px rgba(255,45,120,0.3)`
                : undefined,
            }}
          >
            {/* Hover wash */}
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 group-disabled:hidden" />

            {/* Corner dots */}
            {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c) => (
              <div key={c} className={`absolute w-2 h-2 border-white/30 ${c}`} />
            ))}

            {committing ? (
              <>
                <div
                  className="w-8 h-8 border-2 border-white/30 rounded-full animate-spin"
                  style={{ borderTopColor: cyan }}
                />
                <div className="text-center">
                  <div
                    className="text-2xl font-black uppercase tracking-tighter leading-none"
                    style={{ fontFamily: "Rajdhani, sans-serif" }}
                  >
                    Processing…
                  </div>
                  <div className="text-[10px] font-mono text-white/50 mt-1 uppercase tracking-widest">
                    Signing TX
                  </div>
                </div>
              </>
            ) : committed ? (
              <>
                <div className="text-4xl">✓</div>
                <div className="text-center">
                  <div
                    className="text-2xl font-black uppercase tracking-tighter leading-none"
                    style={{ fontFamily: "Rajdhani, sans-serif", color: cyan }}
                  >
                    Bet Locked
                  </div>
                  <div className="text-[10px] font-mono text-white/50 mt-1 uppercase tracking-widest">
                    Good Luck!
                  </div>
                </div>
              </>
            ) : isSettled ? (
              <div className="text-center px-4">
                <div
                  className="text-2xl font-black uppercase tracking-tighter leading-none text-white/40"
                  style={{ fontFamily: "Rajdhani, sans-serif" }}
                >
                  Match Settled
                </div>
                <div className="text-[10px] font-mono text-white/20 mt-1 uppercase tracking-widest">
                  Betting Closed
                </div>
              </div>
            ) : !bettingOpen ? (
              <div className="text-center px-4">
                <div
                  className="text-2xl font-black uppercase tracking-tighter leading-none text-white/40"
                  style={{ fontFamily: "Rajdhani, sans-serif" }}
                >
                  Betting Closed
                </div>
              </div>
            ) : !ready ? (
              <div className="text-center px-4">
                <div
                  className="text-xl font-black uppercase tracking-tighter leading-none"
                  style={{ fontFamily: "Rajdhani, sans-serif" }}
                >
                  Loading…
                </div>
              </div>
            ) : !walletAddress ? (
              <div className="text-center px-4">
                <div
                  className="text-xl font-black uppercase tracking-tighter leading-none"
                  style={{ fontFamily: "Rajdhani, sans-serif" }}
                >
                  Connect Wallet
                </div>
                <div className="text-[10px] font-mono text-white/50 mt-1 uppercase tracking-widest">
                  Tap to connect
                </div>
              </div>
            ) : !selectedAgent ? (
              <div className="text-center px-4">
                <div
                  className="text-2xl font-black uppercase tracking-tighter leading-none"
                  style={{ fontFamily: "Rajdhani, sans-serif" }}
                >
                  Select Agent
                </div>
                <div className="text-[10px] font-mono text-white/50 mt-1 uppercase tracking-widest">
                  Pick a side first
                </div>
              </div>
            ) : (
              <>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2z" />
                </svg>
                <div className="text-center">
                  <div
                    className="text-3xl font-black uppercase tracking-tighter leading-none"
                    style={{ fontFamily: "Rajdhani, sans-serif" }}
                  >
                    Commit_Stake
                  </div>
                  <div className="text-[10px] font-mono text-white/70 mt-2 uppercase tracking-widest">
                    ${stakeAmount} USDC → {selected?.name ?? ""}
                  </div>
                </div>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function BetClient({
  competitionId,
  competitionTitle,
  agentA,
  agentB,
  bettingOpen,
  winnerId,
  totalBetUsdc,
  status,
  sport,
  recentBets,
}: Props) {
  const { user, login, ready } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = user?.wallet?.address
    ?? wallets.find(w => w.walletClientType !== 'privy')?.address
    ?? wallets[0]?.address
    ?? null;

  const [visible, setVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState(5);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [localBets, setLocalBets] = useState(recentBets);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const cyan = "#00f0ff";
  const magenta = "#ff2d78";

  const sportIcon = SPORT_ICON[sport] ?? "🏸";
  const isSettled = status === "settled" || winnerId !== null;

  // Win probability from stats
  let probA = 0.5;
  let probB = 0.5;
  let multA = 1.8;
  let multB = 2.0;
  if (agentA && agentB) {
    [probA, probB] = winProbability(agentA, agentB);
    multA = multiplier(probA);
    multB = multiplier(probB);
  }

  // Favorite = higher prob
  const aIsFavorite = probA >= probB;

  // Currently selected agent's prob + mult
  const selectedProb = selectedAgent === agentA?.id ? probA : selectedAgent === agentB?.id ? probB : 0.5;
  const selectedMult = selectedAgent ? multiplier(selectedProb) : 1.8;

  // Commit handler
  async function handleCommit() {
    if (!walletAddress || !selectedAgent) {
      if (!walletAddress) login();
      return;
    }
    setTxError(null);
    setCommitting(true);
    playGenerate();

    try {
      const res = await fetch(`/api/competitions/${competitionId}/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betterWallet: walletAddress,
          predictedWinnerId: selectedAgent,
          amountUsdc: Math.min(stakeAmount, 1), // demo cap: $1 without real wallet sig
          payload: {
            txSignature: `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Failed to place bet");
      }

      const data = await res.json();
      setCommitted(true);
      playSuccess();

      // Prepend to local bets feed
      setLocalBets((prev) => [
        {
          id: data.id ?? "new",
          wallet: walletAddress,
          predictedWinnerId: selectedAgent,
          amountUsdc: stakeAmount,
          paidAt: new Date().toISOString(),
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err: any) {
      setTxError(err.message ?? "Unknown error");
      playError();
    } finally {
      setCommitting(false);
    }
  }

  // System log entries
  const sysLog = [
    { tag: "INF", color: cyan, msg: `Match_Status: ${status.toUpperCase()}` },
    {
      tag: "INF",
      color: cyan,
      msg: `Betting_Window: ${bettingOpen ? "OPEN" : "CLOSED"}`,
    },
    {
      tag: isSettled ? "SYS" : "INF",
      color: isSettled ? "#ffe6aa" : cyan,
      msg: winnerId
        ? `Winner_Declared: ${(agentA?.id === winnerId ? agentA : agentB)?.name.toUpperCase()}`
        : `Prize_Pool: $${totalBetUsdc.toFixed(2)}_USDC`,
    },
    { tag: "NET", color: "rgba(255,255,255,0.3)", msg: "End_To_End_Encryption_Active" },
  ];

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: "#05060e",
        backgroundImage: "radial-gradient(circle at 50% 50%, rgba(0,240,255,0.04) 0%, transparent 70%)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
        fontFamily: "Space Grotesk, sans-serif",
      }}
    >
      <ScanLines />

      {/* ── Header ── */}
      <header
        className="fixed top-0 w-full z-40 flex items-center justify-between px-6 py-4"
        style={{
          background: "rgba(5,6,14,0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center gap-6">
          <Link
            href={`/competitions/${competitionId}/result`}
            className="text-[10px] font-mono uppercase tracking-widest text-white/30 hover:text-white/70 transition-colors"
            onClick={() => playClick()}
          >
            ← Back
          </Link>
          <div
            className="text-2xl font-bold italic tracking-tighter"
            style={{
              fontFamily: "Rajdhani, sans-serif",
              color: cyan,
              textShadow: `0 0 8px ${cyan}88`,
            }}
          >
            ARENA<span className="text-white">_</span>TERMINAL
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[9px] font-mono text-white/30 uppercase">SYNC_STATUS</span>
            <span className="text-[9px] font-mono flex items-center gap-1" style={{ color: cyan }}>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: cyan, animation: "pulse 2s infinite" }}
              />
              OPERATIONAL
            </span>
          </div>
          {walletAddress ? (
            <div
              className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest"
              style={{ border: `1px solid ${cyan}33`, color: cyan }}
            >
              {shortWallet(walletAddress)}
            </div>
          ) : (
            <button
              onClick={() => { playClick(); login(); }}
              className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all hover:brightness-125"
              style={{
                border: `1px solid ${magenta}55`,
                color: magenta,
                background: `${magenta}11`,
              }}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="pt-24 px-4 pb-20 max-w-7xl mx-auto">

        {/* Match title bar */}
        <div
          className="mb-8 flex flex-col lg:flex-row items-center justify-between gap-6 py-8"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {agentA && (
            <div className="flex-1 text-center lg:text-left">
              <h1
                className="text-5xl xl:text-6xl font-bold uppercase tracking-tight leading-none mb-2"
                style={{
                  fontFamily: "Rajdhani, sans-serif",
                  color: aIsFavorite ? cyan : magenta,
                  textShadow: `0 0 30px ${(aIsFavorite ? cyan : magenta)}44`,
                }}
              >
                {agentA.name}
              </h1>
              <div className="flex items-center justify-center lg:justify-start gap-4 font-mono">
                <span className="text-white/30 uppercase text-[10px]">Score</span>
                <span
                  className="text-3xl font-bold"
                  style={{ color: aIsFavorite ? cyan : magenta, fontFamily: "JetBrains Mono, monospace" }}
                >
                  {agentA.score}
                </span>
                <div className="h-0.5 w-20 bg-white/10 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 h-full w-3/4" style={{ background: aIsFavorite ? cyan : magenta }} />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <div
              className="font-black text-2xl tracking-[0.5em]"
              style={{ fontFamily: "Rajdhani, sans-serif", color: "rgba(255,255,255,0.15)" }}
            >
              VS
            </div>
            <div
              className="px-5 py-1.5"
              style={{
                background: "rgba(255,45,120,0.1)",
                border: `1px solid ${magenta}55`,
              }}
            >
              <span
                className="font-mono text-xs tracking-widest uppercase"
                style={{ color: magenta, animation: bettingOpen ? "pulse 2s infinite" : undefined }}
              >
                {sportIcon} {sport} // {status.toUpperCase()}
              </span>
            </div>
          </div>

          {agentB && (
            <div className="flex-1 text-center lg:text-right">
              <h1
                className="text-5xl xl:text-6xl font-bold uppercase tracking-tight leading-none mb-2"
                style={{
                  fontFamily: "Rajdhani, sans-serif",
                  color: !aIsFavorite ? cyan : magenta,
                  textShadow: `0 0 30px ${(!aIsFavorite ? cyan : magenta)}44`,
                }}
              >
                {agentB.name}
              </h1>
              <div className="flex items-center justify-center lg:justify-end gap-4 font-mono">
                <div className="h-0.5 w-20 bg-white/10 relative overflow-hidden">
                  <div className="absolute inset-y-0 right-0 h-full w-2/3" style={{ background: !aIsFavorite ? cyan : magenta }} />
                </div>
                <span
                  className="text-3xl font-bold"
                  style={{ color: !aIsFavorite ? cyan : magenta, fontFamily: "JetBrains Mono, monospace" }}
                >
                  {agentB.score}
                </span>
                <span className="text-white/30 uppercase text-[10px]">Score</span>
              </div>
            </div>
          )}
        </div>

        {/* Global stats bar */}
        <div
          className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-px"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          {[
            { label: "Prize Pool", value: `$${totalBetUsdc.toFixed(2)}`, unit: "USDC", color: cyan },
            { label: "Match Type", value: sport.toUpperCase(), unit: "", color: "white" },
            { label: "Betting", value: bettingOpen ? "OPEN" : "CLOSED", unit: "", color: bettingOpen ? "#22ff88" : "rgba(255,255,255,0.3)" },
            { label: "Status", value: status.toUpperCase(), unit: "", color: isSettled ? "#ffe6aa" : cyan },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="p-5" style={{ background: "rgba(5,6,14,0.4)" }}>
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1">{label}</div>
              <div
                className="text-2xl font-mono font-bold"
                style={{ color, fontFamily: "JetBrains Mono, monospace" }}
              >
                {value}
                {unit && <span className="text-sm font-normal text-white/40 ml-1">{unit}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Agent cards */}
        {agentA && agentB && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <AgentCard
              agent={agentA}
              isFavorite={aIsFavorite}
              winProb={probA}
              mult={multA}
              selected={selectedAgent === agentA.id}
              bettingOpen={bettingOpen && !isSettled && !committed}
              winnerId={winnerId}
              onSelect={() => setSelectedAgent(agentA.id)}
            />
            <AgentCard
              agent={agentB}
              isFavorite={!aIsFavorite}
              winProb={probB}
              mult={multB}
              selected={selectedAgent === agentB.id}
              bettingOpen={bettingOpen && !isSettled && !committed}
              winnerId={winnerId}
              onSelect={() => setSelectedAgent(agentB.id)}
            />
          </div>
        )}

        {/* Stake terminal */}
        <div className="mb-8">
          <StakeTerminal
            selectedAgent={selectedAgent}
            agentA={agentA}
            agentB={agentB}
            stakeAmount={stakeAmount}
            onAmountChange={setStakeAmount}
            winProb={selectedProb}
            mult={selectedMult}
            bettingOpen={bettingOpen}
            winnerId={winnerId}
            onCommit={handleCommit}
            committing={committing}
            committed={committed}
            walletAddress={walletAddress}
          />

          {txError && (
            <div
              className="mt-2 px-4 py-3 font-mono text-xs uppercase tracking-widest"
              style={{ background: "rgba(255,45,120,0.1)", border: `1px solid ${magenta}44`, color: magenta }}
            >
              ERR: {txError}
            </div>
          )}
        </div>

        {/* Bottom grid: Volume Flow + System Log */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Volume Flow */}
          <div
            className="p-6"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1)",
              borderLeft: `2px solid ${cyan}66`,
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h4
                className="text-xl font-bold uppercase tracking-widest flex items-center gap-3"
                style={{ fontFamily: "Rajdhani, sans-serif" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cyan} strokeWidth="2">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
                Volume_Flow
              </h4>
              <span className="text-[9px] font-mono text-white/20 uppercase">Live Feed</span>
            </div>
            <div className="space-y-3">
              {localBets.length === 0 ? (
                <div className="font-mono text-[10px] text-white/20 uppercase">No bets yet — be the first.</div>
              ) : (
                localBets.slice(0, 6).map((b) => {
                  const onA = b.predictedWinnerId === agentA?.id;
                  const betColor = onA ? (aIsFavorite ? cyan : magenta) : (!aIsFavorite ? cyan : magenta);
                  const agentName = onA ? agentA?.name : agentB?.name;
                  return (
                    <div
                      key={b.id}
                      className="flex justify-between items-center pb-2"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <span className="text-[10px] font-mono text-white/30">{shortWallet(b.wallet)}</span>
                      <span className="text-[10px] font-mono font-bold" style={{ color: betColor }}>
                        +${b.amountUsdc} ON {agentName?.toUpperCase()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* System Log */}
          <div
            className="p-6"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1)",
              borderRight: `2px solid ${magenta}66`,
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h4
                className="text-xl font-bold uppercase tracking-widest flex items-center gap-3"
                style={{ fontFamily: "Rajdhani, sans-serif" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={magenta} strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                System_Log
              </h4>
              <span className="text-[9px] font-mono text-white/20 uppercase">Secure Link</span>
            </div>
            <div className="space-y-3">
              {sysLog.map(({ tag, color, msg }, i) => (
                <div key={i} className="flex gap-4 font-mono text-[10px] text-white/50 uppercase leading-relaxed">
                  <span style={{ color }}>{tag}:</span>
                  <span>{msg}</span>
                </div>
              ))}
              {committed && (
                <div className="flex gap-4 font-mono text-[10px] uppercase leading-relaxed">
                  <span style={{ color: "#22ff88" }}>BET:</span>
                  <span style={{ color: "#22ff88" }}>
                    Stake_Committed: ${stakeAmount}_USDC → {(selectedAgent === agentA?.id ? agentA : agentB)?.name.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Winner banner */}
        {isSettled && winnerId && (
          <div
            className="mt-8 p-6 text-center relative overflow-hidden"
            style={{
              background: "rgba(255,230,170,0.05)",
              border: "1px solid rgba(255,230,170,0.2)",
            }}
          >
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%, #ffe6aa 0%, transparent 70%)" }}
            />
            <div className="relative">
              <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">Match Concluded</div>
              <div
                className="text-5xl font-black uppercase tracking-wider"
                style={{
                  fontFamily: "Rajdhani, sans-serif",
                  color: "#ffe6aa",
                  textShadow: "0 0 30px rgba(255,230,170,0.4)",
                }}
              >
                {(agentA?.id === winnerId ? agentA : agentB)?.name} — WINNER
              </div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
          <Link
            href={`/competitions/${competitionId}/live`}
            onClick={() => playClick()}
            className="flex items-center justify-center gap-2 py-4 font-mono text-xs uppercase tracking-widest transition-all text-center"
            style={{ border: `1px solid ${cyan}33`, color: cyan }}
            onMouseEnter={(e) => (e.currentTarget.style.background = `${cyan}0a`)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            ▶ Live Match
          </Link>
          <Link
            href={`/competitions/${competitionId}/result`}
            onClick={() => playClick()}
            className="flex items-center justify-center gap-2 py-4 font-mono text-xs uppercase tracking-widest transition-all text-center"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
          >
            Results →
          </Link>
          <Link
            href="/challenges"
            onClick={() => playClick()}
            className="flex items-center justify-center gap-2 py-4 font-black uppercase tracking-tighter text-sm transition-all text-center hover:skew-x-[-4deg]"
            style={{
              fontFamily: "Rajdhani, sans-serif",
              background: magenta,
              color: "white",
              boxShadow: `0 0 15px ${magenta}44`,
            }}
          >
            Find Match →
          </Link>
        </div>
      </main>
    </div>
  );
}

