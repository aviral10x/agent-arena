"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { getAgentAvatar } from "@/lib/agent-avatars";
import { SFX_MAP } from "@/lib/sfx";
import { SportCourtCanvas } from "@/components/arena/sport-court-canvas";
import { useMatchSocket } from "@/hooks/use-match-socket";
import { getScoreDisplay, type GameState } from "@/lib/game-engine";

type Agent = {
  id: string;
  name: string;
  color: string;
  archetype: string;
  strategy: string;
  risk: string;
  speed: number;
  power: number;
  stamina: number;
  accuracy: number;
  score: number;
  pnlPct: number;
  trades: number;
  owner?: string;
  specialMoves?: string;
} | null;

type Props = {
  competitionId: string;
  competitionTitle: string;
  competitionStatus: string;
  agentA: Agent;
  agentB: Agent;
  totalBetUsdc: number;
  oddsA: string;
  oddsB: string;
  isSport: boolean;
  sport: string;
  viewerWallet?: string;
};

// ── Stat bar ─────────────────────────────────────────────────────────────────
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-[9px] font-mono text-[#464752]">{label}</span>
      <div className="flex-1" style={{ height: "3px", background: "rgba(70,71,82,0.3)" }}>
        <div style={{ width: `${(value / 10) * 100}%`, height: "100%", background: color }} />
      </div>
      <span className="w-4 text-[9px] font-mono text-[#464752] text-right">{value}</span>
    </div>
  );
}

// ── Agent side panel ──────────────────────────────────────────────────────────
function AgentPanel({
  agent, side, momentum, fatigue, gameState,
}: {
  agent: Agent; side: "a" | "b"; momentum: number; fatigue: number; gameState: GameState | null;
}) {
  const initials = agent ? agent.name.slice(0, 2).toUpperCase() : side.toUpperCase().repeat(2);
  const color = agent?.color ?? (side === "a" ? "#00f0ff" : "#ff2d78");

  // Real set scores
  const setScores = gameState && agent
    ? (gameState.sets[gameState.currentSet]?.agentScores[agent.id] ?? 0)
    : 0;

  return (
    <div
      className="col-span-3 bg-[#171924] flex flex-col overflow-y-auto"
      style={{
        borderRight: side === "a" ? "1px solid rgba(70,71,82,0.2)" : undefined,
        borderLeft:  side === "b" ? "1px solid rgba(70,71,82,0.2)" : undefined,
      }}
    >
      <div className="border-b border-[#464752]/20">
        <div className="px-4 pt-3 pb-2 text-[9px] font-mono uppercase tracking-widest text-[#464752]">
          {side === "a" ? "Challenger_A" : "Defender_B"}
        </div>
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "1/1", border: `2px solid ${color}66`, boxShadow: `0 0 20px ${color}33` }}
        >
          <img
            src={getAgentAvatar(agent?.id ?? "", agent?.archetype)}
            alt={agent?.name ?? "Agent"}
            className="w-full h-full object-cover"
            style={{ filter: "grayscale(30%) brightness(0.8) contrast(1.2)" }}
          />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${color}22 0%, transparent 60%)` }} />
          <div className="absolute bottom-0 left-0 w-full px-3 pb-2">
            <div className="font-['Bebas_Neue'] text-xl tracking-wider uppercase" style={{ color }}>
              {agent?.name ?? "TBD"}
            </div>
            <div className="text-[8px] font-mono uppercase" style={{ color: `${color}99` }}>
              {agent?.archetype ?? "—"}
            </div>
          </div>
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 rounded-full animate-ping" style={{ background: color, opacity: 0.6 }} />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Set Pts",   value: `${setScores}` },
            { label: "Rally",     value: gameState ? `${gameState.rallyLength}` : "0" },
            { label: "Momentum",  value: `${momentum.toFixed(0)}%` },
            { label: "Fatigue",   value: `${fatigue.toFixed(0)}%` },
          ].map((s) => (
            <div key={s.label} className="bg-[#11131d] border border-[#464752]/20 p-2">
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">{s.label}</div>
              <div className="font-mono text-sm font-bold text-[#eeecfa] mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Momentum bar */}
        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752] mb-1">Momentum</div>
          <div className="h-2 bg-[#11131d] border border-[#464752]/20">
            <div
              className="h-full transition-all duration-700"
              style={{ width: `${momentum}%`, background: color, boxShadow: `0 0 10px ${color}` }}
            />
          </div>
        </div>

        {/* Fatigue bar */}
        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752] mb-1">
            Fatigue {fatigue > 70 ? <span className="text-[#ff2d78]">(EXHAUSTED)</span> : ""}
          </div>
          <div className="h-2 bg-[#11131d] border border-[#464752]/20">
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${fatigue}%`,
                background: fatigue > 70 ? "#ff2d78" : fatigue > 40 ? "#ffd666" : "#00ff87",
              }}
            />
          </div>
        </div>

        <div className="space-y-2 mt-2">
          <StatBar label="SPD" value={agent?.speed ?? 7} color="#00f0ff" />
          <StatBar label="PWR" value={agent?.power ?? 7} color="#ffd666" />
          <StatBar label="STA" value={agent?.stamina ?? 7} color="#00ff87" />
          <StatBar label="ACC" value={agent?.accuracy ?? 7} color="#ff2d78" />
        </div>

        {agent && (
          <Link
            href={`/agents/${agent.id}`}
            className="block mt-2 text-center text-[9px] font-mono uppercase tracking-widest text-[#464752] hover:text-[#aaaab6] transition-colors border border-[#464752]/20 py-1"
          >
            View_Profile →
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function LiveMatchClient({
  competitionId,
  competitionTitle,
  competitionStatus,
  agentA,
  agentB,
  totalBetUsdc,
  oddsA,
  oddsB,
  isSport,
  sport,
  viewerWallet,
}: Props) {
  const router  = useRouter();
  const [muted, setMuted]           = useState(false);
  const [trainerInput, setTrainerInput] = useState("");
  const [flashText, setFlashText]   = useState<string | null>(null);
  const [shareMsg, setShareMsg]     = useState<string | null>(null);
  const [showBetPanel, setShowBetPanel] = useState(false);
  const [betPick, setBetPick]       = useState<"a" | "b" | null>(null);
  const [betAmount, setBetAmount]   = useState(5);
  const [betSubmitting, setBetSubmitting] = useState(false);
  const [betDone, setBetDone]       = useState(false);

  // Privy wallet for inline betting
  const { user, login: privyLogin, ready: privyReady } = usePrivy();
  const { wallets } = useWallets();
  const betWallet = user?.wallet?.address
    ?? wallets.find(w => w.walletClientType !== 'privy')?.address
    ?? wallets[0]?.address
    ?? '';
  const prevRallyRef = useRef<string | null>(null);
  const [log, setLog] = useState([
    "> SYSTEM: Match initialized",
    `> AGENT_A: ${agentA?.strategy ?? "Analyzing opponent..."}`,
    `> AGENT_B: ${agentB?.strategy ?? "Executing formation"}`,
    "> REFEREE: Waiting for players…",
  ]);

  const colorA = agentA?.color ?? "#00f0ff";
  const colorB = agentB?.color ?? "#ff2d78";

  // ── Determine viewer side ──────────────────────────────────────────────────
  const viewerSide: "a" | "b" | null =
    viewerWallet && agentA?.owner?.toLowerCase() === viewerWallet.toLowerCase() ? "a" :
    viewerWallet && agentB?.owner?.toLowerCase() === viewerWallet.toLowerCase() ? "b" :
    null;

  // Parse special moves
  const parseMoves = (raw?: string) => { try { return JSON.parse(raw || "[]"); } catch { return []; } };

  const playerConfig = viewerSide && (viewerSide === "a" ? agentA : agentB) ? {
    userId:       viewerWallet!,
    agentId:      (viewerSide === "a" ? agentA : agentB)!.id,
    agentName:    (viewerSide === "a" ? agentA : agentB)!.name,
    agentColor:   (viewerSide === "a" ? agentA : agentB)!.color,
    side:         viewerSide,
    stats: {
      speed:    (viewerSide === "a" ? agentA : agentB)!.speed   ?? 7,
      power:    (viewerSide === "a" ? agentA : agentB)!.power   ?? 7,
      stamina:  (viewerSide === "a" ? agentA : agentB)!.stamina ?? 7,
      accuracy: (viewerSide === "a" ? agentA : agentB)!.accuracy ?? 7,
    },
    strategy:     (viewerSide === "a" ? agentA : agentB)!.strategy   ?? "Balanced",
    risk:         (viewerSide === "a" ? agentA : agentB)!.risk       ?? "Balanced",
    specialMoves: parseMoves((viewerSide === "a" ? agentA : agentB)!.specialMoves),
  } : null;

  const socket = useMatchSocket(isSport ? competitionId : "", playerConfig);

  // ── Real game state from WebSocket ──────────────────────────────────────────
  const gs = socket.gameState;

  // Real positions from game state, with smooth defaults
  const agentPosA = useMemo(() => {
    if (!gs || !agentA) return { x: 30, y: 72 };
    const p = gs.agentPositions[agentA.id];
    return p ? { x: p.x, y: p.y } : { x: 30, y: 72 };
  }, [gs, agentA]);

  const agentPosB = useMemo(() => {
    if (!gs || !agentB) return { x: 70, y: 28 };
    const p = gs.agentPositions[agentB.id];
    return p ? { x: p.x, y: p.y } : { x: 70, y: 28 };
  }, [gs, agentB]);

  const lastAction = gs?.lastAction ?? "SERVE";
  const attackerIsA = gs ? gs.lastAgentId === agentA?.id : true;

  // Real momentum + fatigue
  const momentumA = gs && agentA ? (gs.momentum[agentA.id] ?? 50) : 50;
  const momentumB = gs && agentB ? (gs.momentum[agentB.id] ?? 50) : 50;
  const fatigueA  = gs && agentA ? ((gs.fatigue as Record<string,number>)?.[agentA.id] ?? 0) : 0;
  const fatigueB  = gs && agentB ? ((gs.fatigue as Record<string,number>)?.[agentB.id] ?? 0) : 0;

  // Real scores
  const scores = useMemo(() => {
    if (!gs || !agentA || !agentB) return { current: { a1: 0, a2: 0 }, setsWon: { a1: 0, a2: 0 }, sets: [] };
    return getScoreDisplay(gs, [agentA.id, agentB.id]);
  }, [gs, agentA, agentB]);

  // Rally tick counter (for canvas animation)
  const tick = gs?.rallyCount ?? 0;

  // ── Log + flash + SFX on rally events ──────────────────────────────────────
  useEffect(() => {
    if (!socket.lastRally || socket.lastRally.description === prevRallyRef.current) return;
    prevRallyRef.current = socket.lastRally.description;

    const { description, action, pointWon, attackerSide } = socket.lastRally;
    setLog(l => [...l.slice(-20), `> ${description}`]);

    // Flash text on point-winning shots
    if (pointWon) {
      const flashLabel =
        action === "SMASH"   ? "SMASH!" :
        action === "SPECIAL" ? "SPECIAL!" :
        action === "DROP"    ? "DROP ACE!" :
        action === "DRIVE"   ? "DRIVE!" :
        "POINT!";
      setFlashText(flashLabel);
      setTimeout(() => setFlashText(null), 1800);

      if (!muted) SFX_MAP[flashLabel]?.() ?? SFX_MAP["POINT!"]?.();
    } else {
      if (!muted && action === "SMASH") SFX_MAP["SMASH!"]?.();
    }
  }, [socket.lastRally, muted]);

  // Status messages
  useEffect(() => {
    if (socket.statusMessage && socket.statusMessage !== "Connecting...") {
      setLog(l => [...l.slice(-20), `> ${socket.statusMessage}`]);
    }
  }, [socket.statusMessage]);

  // Redirect on match end
  useEffect(() => {
    if (socket.status === "settled" && socket.winner) {
      const timer = setTimeout(() => {
        router.push(`/competitions/${competitionId}/result`);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [socket.status, socket.winner, competitionId, router]);

  // ── Trainer command submit ──────────────────────────────────────────────────
  const handleTrainerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerInput.trim()) return;
    setLog(l => [...l.slice(-20), `> TRAINER: ${trainerInput}`]);
    if (viewerSide) socket.sendCommand(trainerInput);
    setTrainerInput("");
  };

  // ── Share URL ──────────────────────────────────────────────────────────────
  const matchUrl = typeof window !== "undefined"
    ? `${window.location.origin}/competitions/${competitionId}/live`
    : `/competitions/${competitionId}/live`;

  const handleShare = () => {
    const text = `🏸 LIVE: ${agentA?.name ?? "?"} vs ${agentB?.name ?? "?"} — watch & bet!`;
    navigator.clipboard.writeText(matchUrl).then(() => {
      setShareMsg("Link copied!");
      setTimeout(() => setShareMsg(null), 2000);
    }).catch(() => {});
  };

  const handleShareX = () => {
    const text = encodeURIComponent(
      `🏸 ${agentA?.name ?? "?"} vs ${agentB?.name ?? "?"} LIVE on Agent Arena!\n\nWatch & place your bets 👇\n${matchUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  return (
    <div className="overflow-hidden h-screen flex flex-col bg-[#05060e] text-[#eeecfa]">
      <div className="scanline fixed inset-0 z-[60] opacity-10 pointer-events-none" />

      {/* ── Top nav ── */}
      <header className="shrink-0 h-12 bg-[#11131d] border-b border-[#00f0ff]/20 flex items-center px-4 gap-3 z-50">
        <Link href="/challenges" className="text-[10px] font-mono uppercase tracking-widest text-[#464752] hover:text-[#aaaab6] transition-colors">
          ← Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#00f0ff] rounded-full animate-ping" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#00f0ff]">
            {socket.status === "settled" ? "MATCH_OVER" : "LIVE_MATCH"}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#464752] truncate hidden sm:block">{competitionTitle}</span>

        {/* Share buttons */}
        <div className="ml-auto flex items-center gap-2">
          {shareMsg && (
            <span className="text-[9px] font-mono text-[#00ff87]">{shareMsg}</span>
          )}
          <button
            onClick={handleShare}
            className="border border-[#464752]/40 text-[#aaaab6] px-2 py-1 font-mono text-[10px] uppercase hover:bg-[#171924] transition-colors"
            title="Copy match link"
          >
            COPY_LINK
          </button>
          <button
            onClick={handleShareX}
            className="border border-[#464752]/40 text-[#aaaab6] px-2 py-1 font-mono text-[10px] uppercase hover:bg-[#171924] transition-colors"
            title="Share on X"
          >
            SHARE_X
          </button>
        </div>

        <div className="flex items-center gap-1 bg-[#11131d] border border-[#00f0ff]/20 p-0.5">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest bg-[#00f0ff] text-[#005d63]">
            TACTICAL_LENS
          </div>
          <button
            onClick={() => router.push(`/competitions/${competitionId}/cinematic`)}
            className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-[#464752] hover:text-[#aaaab6] transition-colors"
          >
            CINEMATIC
          </button>
        </div>

        <button
          onClick={() => setShowBetPanel(p => !p)}
          className={`border px-3 py-1 font-mono text-[10px] uppercase transition-colors ${
            showBetPanel
              ? "border-[#ff2d78] bg-[#ff2d78]/20 text-[#ff2d78]"
              : "border-[#ff2d78]/40 text-[#ff2d78] hover:bg-[#ff2d78]/10"
          }`}
        >
          {showBetPanel ? "HIDE_BETS" : "PLACE_BET"}
        </button>

        <button
          onClick={() => setMuted(m => !m)}
          className="border border-[#464752]/30 px-2 py-1 font-mono text-[10px] uppercase text-[#464752] hover:text-[#aaaab6] transition-colors"
        >
          {muted ? "SFX_OFF" : "SFX_ON"}
        </button>
      </header>

      {/* ── Set score strip ── */}
      <div className="shrink-0 h-8 bg-[#11131d]/60 border-b border-[#464752]/10 flex items-center justify-center gap-6 text-[10px] font-mono uppercase">
        <span style={{ color: colorA }}>{agentA?.name.slice(0, 10) ?? "A"}</span>
        {scores.sets.map((s, i) => (
          <span key={i} className={`px-2 ${i === (gs?.currentSet ?? 0) ? "text-[#ffd666]" : "text-[#464752]"}`}>
            {s.a1}–{s.a2}
          </span>
        ))}
        <span className="text-[#464752]">|</span>
        <span className="text-[#eeecfa]">Sets: {scores.setsWon.a1}–{scores.setsWon.a2}</span>
        <span className="text-[#464752]">|</span>
        <span style={{ color: colorB }}>{agentB?.name.slice(0, 10) ?? "B"}</span>
        {gs && (
          <>
            <span className="text-[#464752]">|</span>
            <span className="text-[#464752]">Height: {(gs.shuttleHeight ?? 0).toFixed(1)}</span>
          </>
        )}
      </div>

      {/* ── Main 3-col grid ── */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">

        {/* Agent A panel */}
        <AgentPanel agent={agentA} side="a" momentum={momentumA} fatigue={fatigueA} gameState={gs} />

        {/* Arena Canvas */}
        <div className="col-span-6 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #0d1020 0%, #05060e 100%)" }}>
          <div
            className="absolute inset-0"
            style={{ backgroundImage: "radial-gradient(circle, rgba(143,245,255,0.15) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
          />
          <div className="absolute inset-8 border-2" style={{ borderColor: "rgba(143,245,255,0.3)" }} />
          <div className="absolute top-8 bottom-8 left-1/2 -translate-x-px border-l border-dashed" style={{ borderColor: "rgba(143,245,255,0.15)" }} />
          <div
            className="absolute top-8 bottom-8 left-1/2 -translate-x-px w-px"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(143,245,255,0.6) 20%, rgba(143,245,255,0.6) 80%, transparent)" }}
          />

          <SportCourtCanvas
            agentPosA={agentPosA}
            agentPosB={agentPosB}
            colorA={colorA}
            colorB={colorB}
            avatarA={getAgentAvatar(agentA?.id ?? "", agentA?.archetype)}
            avatarB={getAgentAvatar(agentB?.id ?? "", agentB?.archetype)}
            nameA={agentA?.name ?? "Agent_A"}
            nameB={agentB?.name ?? "Agent_B"}
            lastAction={lastAction}
            tick={tick}
            attackerIsA={attackerIsA}
          />

          {/* Action flash on point-winning shots */}
          {flashText && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div
                className="font-['Space_Grotesk'] text-7xl font-black italic -skew-x-12 opacity-70 select-none animate-pulse"
                style={{ color: "#00f0ff", textShadow: "0 0 40px #00f0ff" }}
              >
                {flashText}
              </div>
            </div>
          )}

          {/* Score HUD */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-6 z-20">
            <div className="text-center">
              <div className="font-['Space_Grotesk'] font-black text-3xl" style={{ color: colorA, textShadow: `0 0 20px ${colorA}` }}>
                {scores.current.a1}
              </div>
              <div className="text-[8px] font-mono text-[#464752] uppercase">{agentA?.name.slice(0, 8) ?? "A"}</div>
            </div>
            <div className="text-[#464752] font-mono text-xs">VS</div>
            <div className="text-center">
              <div className="font-['Space_Grotesk'] font-black text-3xl" style={{ color: colorB, textShadow: `0 0 20px ${colorB}` }}>
                {scores.current.a2}
              </div>
              <div className="text-[8px] font-mono text-[#464752] uppercase">{agentB?.name.slice(0, 8) ?? "B"}</div>
            </div>
          </div>

          {/* Status indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <span
              className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border"
              style={{
                color: socket.status === "settled" ? "#ff2d78" : "#00f0ff",
                borderColor: socket.status === "settled" ? "rgba(255,45,120,0.4)" : "rgba(143,245,255,0.4)",
                background: socket.status === "settled" ? "rgba(255,45,120,0.1)" : "rgba(143,245,255,0.1)",
              }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-ping mr-1.5 align-middle"
                style={{ background: socket.status === "settled" ? "#ff2d78" : "#00f0ff" }} />
              {socket.status === "settled"
                ? `${socket.winner?.agentName ?? ""} WINS!`
                : socket.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Agent B panel */}
        <AgentPanel agent={agentB} side="b" momentum={momentumB} fatigue={fatigueB} gameState={gs} />
      </div>

      {/* ── Trainer Console ── */}
      <div className="shrink-0 bg-[#11131d] border-t border-[#00f0ff]/20">
        {socket.commandWindowOpen && (
          <div className="relative h-1 bg-[#11131d] overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#00f0ff] transition-none"
              style={{ width: "100%", animation: `shrink ${socket.commandWindowMs}ms linear forwards` }}
            />
            <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
          </div>
        )}
        {socket.commandWindowOpen && viewerSide && (
          <div className="px-4 py-1 flex items-center gap-2 bg-[#00f0ff]/08 border-b border-[#00f0ff]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-ping" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#00f0ff]">
              Command Window — {(socket.commandWindowMs / 1000).toFixed(1)}s
            </span>
            <span className="ml-auto text-[9px] font-mono text-[#464752] uppercase">
              Playing as {viewerSide === "a" ? agentA?.name : agentB?.name}
            </span>
          </div>
        )}
        <div className="h-20 flex items-stretch">
          <div className="flex-1 overflow-hidden p-3 font-mono text-[10px] text-[#464752] space-y-0.5">
            {log.slice(-4).map((l, i) => (
              <div key={i} className="truncate">{l}</div>
            ))}
          </div>
          <form onSubmit={handleTrainerSubmit} className="flex items-stretch border-l border-[#00f0ff]/20 w-80">
            <input
              value={trainerInput}
              onChange={e => setTrainerInput(e.target.value)}
              placeholder={socket.commandWindowOpen && viewerSide ? "Send command to your agent…" : "Enter trainer command…"}
              className="flex-1 bg-transparent px-4 text-xs font-mono text-[#eeecfa] placeholder:text-[#464752] outline-none"
            />
            <button
              type="submit"
              className="px-4 font-['Space_Grotesk'] font-black uppercase text-xs hover:brightness-110 transition-all"
              style={{
                background: socket.commandWindowOpen && viewerSide ? "#00f0ff" : "#1a1d2b",
                color:      socket.commandWindowOpen && viewerSide ? "#005d63" : "#464752",
              }}
            >
              EXECUTE_OP
            </button>
          </form>
        </div>
      </div>

      {/* ── Bottom betting strip ── */}
      <div
        className="shrink-0 border-t border-[#00f0ff]/20 px-4 py-3 flex items-center gap-6"
        style={{ background: "rgba(11,13,22,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 bg-[#ff2d78] rounded-full animate-ping" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff2d78]">MARKET_LIVE</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setBetPick("a"); setShowBetPanel(true); }}
            className={`px-4 py-2 border font-mono text-xs uppercase hover:brightness-110 transition-colors ${betPick === "a" ? "ring-1 ring-white/30" : ""}`}
            style={{ background: `${colorA}14`, borderColor: `${colorA}40`, color: colorA }}
          >
            {agentA?.name.slice(0, 8) ?? "A"} · {oddsA}x
          </button>
          <button
            onClick={() => { setBetPick("b"); setShowBetPanel(true); }}
            className={`px-4 py-2 border font-mono text-xs uppercase hover:brightness-110 transition-colors ${betPick === "b" ? "ring-1 ring-white/30" : ""}`}
            style={{ background: `${colorB}14`, borderColor: `${colorB}40`, color: colorB }}
          >
            {agentB?.name.slice(0, 8) ?? "B"} · {oddsB}x
          </button>
        </div>
        <div className="text-[10px] font-mono text-[#464752]">
          Pool: <span className="text-[#ffd666]">${totalBetUsdc.toFixed(2)}</span>
        </div>
        <button
          onClick={() => setShowBetPanel(p => !p)}
          className="ml-auto bg-[#ff2d78] text-[#48001b] px-5 py-2 font-['Space_Grotesk'] font-black uppercase text-xs hover:skew-x-[-6deg] transition-all"
        >
          {showBetPanel ? "CLOSE ×" : "PLACE_STAKE →"}
        </button>
      </div>

      {/* ── Inline Bet Panel (slides up from bottom) ── */}
      {showBetPanel && (
        <div
          className="shrink-0 border-t border-[#ff2d78]/30 px-4 py-4"
          style={{ background: "rgba(11,13,22,0.95)", backdropFilter: "blur(16px)" }}
        >
          {!privyReady ? (
            <div className="text-center text-[10px] font-mono text-[#464752]">Loading…</div>
          ) : !betWallet ? (
            <div className="text-center">
              <button
                onClick={() => privyLogin()}
                className="bg-[#ff2d78] text-[#48001b] px-6 py-2 font-['Space_Grotesk'] font-black uppercase text-xs hover:brightness-110 transition-all"
              >
                CONNECT_WALLET_TO_BET
              </button>
            </div>
          ) : betDone ? (
            <div className="text-center text-[#00ff87] font-mono text-sm uppercase">
              Bet placed! Good luck 🏸
            </div>
          ) : (
            <div className="flex items-center gap-4 max-w-3xl mx-auto">
              {/* Pick side */}
              <div className="flex gap-2">
                <button
                  onClick={() => setBetPick("a")}
                  className={`px-3 py-2 border font-mono text-[10px] uppercase transition-all ${
                    betPick === "a"
                      ? "border-[#00f0ff] bg-[#00f0ff]/15 text-[#00f0ff]"
                      : "border-[#464752]/30 text-[#464752] hover:border-[#464752]"
                  }`}
                >
                  {agentA?.name.slice(0, 10) ?? "A"}
                </button>
                <button
                  onClick={() => setBetPick("b")}
                  className={`px-3 py-2 border font-mono text-[10px] uppercase transition-all ${
                    betPick === "b"
                      ? "border-[#ff2d78] bg-[#ff2d78]/15 text-[#ff2d78]"
                      : "border-[#464752]/30 text-[#464752] hover:border-[#464752]"
                  }`}
                >
                  {agentB?.name.slice(0, 10) ?? "B"}
                </button>
              </div>

              {/* Amount */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#464752] uppercase">USDC</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={betAmount}
                  onChange={e => setBetAmount(Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="w-20 bg-[#11131d] border border-[#464752]/30 px-2 py-1 text-sm font-mono text-[#eeecfa] text-center outline-none focus:border-[#ff2d78]/60"
                />
                <div className="flex gap-1">
                  {[1, 5, 10, 25].map(v => (
                    <button
                      key={v}
                      onClick={() => setBetAmount(v)}
                      className={`px-2 py-1 text-[9px] font-mono border transition-colors ${
                        betAmount === v
                          ? "border-[#ffd666]/60 text-[#ffd666] bg-[#ffd666]/10"
                          : "border-[#464752]/20 text-[#464752] hover:text-[#aaaab6]"
                      }`}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payout preview */}
              <div className="text-center">
                <div className="text-[9px] font-mono text-[#464752] uppercase">Payout</div>
                <div className="font-mono text-sm text-[#ffd666] font-bold">
                  ${betPick ? (betAmount * parseFloat(betPick === "a" ? oddsA : oddsB)).toFixed(2) : "—"}
                </div>
              </div>

              {/* Commit */}
              <button
                onClick={async () => {
                  if (!betPick || !betWallet) return;
                  setBetSubmitting(true);
                  try {
                    const selectedAgentId = betPick === "a" ? agentA?.id : agentB?.id;
                    await fetch(`/api/competitions/${competitionId}/bet`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        predictedWinnerId: selectedAgentId,
                        amountUsdc: betAmount,
                        betterWallet: betWallet,
                      }),
                    });
                    setBetDone(true);
                  } catch {
                    // silently fail for now
                  }
                  setBetSubmitting(false);
                }}
                disabled={!betPick || betSubmitting}
                className="bg-[#ff2d78] text-[#48001b] px-5 py-2 font-['Space_Grotesk'] font-black uppercase text-xs hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {betSubmitting ? "PLACING…" : "COMMIT_BET (DEMO)"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
