"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getAgentAvatar } from "@/lib/agent-avatars";
import { SFX_MAP } from "@/lib/sfx";
import { SportCourtCanvas } from "@/components/arena/sport-court-canvas";
import { useMatchSocket } from "@/hooks/use-match-socket";

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
  // Optional: viewer's wallet to detect which side they own
  viewerWallet?: string;
};

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

function AgentPanel({ agent, side, tick }: { agent: Agent; side: "a" | "b"; tick: number }) {
  const initials = agent ? agent.name.slice(0, 2).toUpperCase() : side.toUpperCase().repeat(2);
  const color = agent?.color ?? (side === "a" ? "#8ff5ff" : "#ff6c92");
  const momentum = side === "a"
    ? Math.min(95, 55 + (tick % 5) * 8)
    : Math.min(95, 40 + (tick % 4) * 7);

  return (
    <div className="col-span-3 bg-[#171924] border-r border-[#464752]/20 flex flex-col overflow-y-auto"
      style={{ borderRightColor: side === "b" ? "transparent" : undefined, borderLeftColor: side === "b" ? "rgba(70,71,82,0.2)" : undefined, borderLeftWidth: side === "b" ? "1px" : undefined }}>
      <div className="border-b border-[#464752]/20">
        <div className="px-4 pt-3 pb-2 text-[9px] font-mono uppercase tracking-widest text-[#464752]">
          {side === "a" ? "Challenger_A" : "Defender_B"}
        </div>
        {/* Portrait */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: "1/1",
            border: `2px solid ${color}66`,
            boxShadow: `0 0 20px ${color}33`,
          }}
        >
          <img
            src={getAgentAvatar(agent?.id ?? "", agent?.archetype)}
            alt={agent?.name ?? "Agent"}
            className="w-full h-full object-cover"
            style={{ filter: "grayscale(30%) brightness(0.8) contrast(1.2)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${color}22 0%, transparent 60%)` }}
          />
          <div className="absolute bottom-0 left-0 w-full px-3 pb-2">
            <div className="font-['Bebas_Neue'] text-xl tracking-wider uppercase" style={{ color }}>
              {agent?.name ?? "TBD"}
            </div>
            <div className="text-[8px] font-mono uppercase" style={{ color: `${color}99` }}>
              {agent?.archetype ?? "—"}
            </div>
          </div>
          {/* Scan line accent */}
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 rounded-full animate-ping" style={{ background: color, opacity: 0.6 }} />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Score",   value: agent ? `${agent.score} pts` : "—" },
            { label: "Trades",  value: agent ? `${agent.trades}` : "—" },
            { label: "PnL",     value: agent ? `${agent.pnlPct >= 0 ? "+" : ""}${agent.pnlPct.toFixed(1)}%` : "—" },
            { label: "Energy",  value: `${momentum}%` },
          ].map((s) => (
            <div key={s.label} className="bg-[#11131d] border border-[#464752]/20 p-2">
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">{s.label}</div>
              <div className="font-mono text-sm font-bold text-[#eeecfa] mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752] mb-1">Momentum</div>
          <div className="h-2 bg-[#11131d] border border-[#464752]/20">
            <div
              className="h-full transition-all duration-700"
              style={{ width: `${momentum}%`, background: color, boxShadow: `0 0 10px ${color}` }}
            />
          </div>
        </div>

        <div className="space-y-2 mt-2">
          <StatBar label="SPD" value={agent?.speed ?? 7} color="#8ff5ff" />
          <StatBar label="PWR" value={agent?.power ?? 7} color="#ffe6aa" />
          <StatBar label="STA" value={agent?.stamina ?? 7} color="#00ff87" />
          <StatBar label="ACC" value={agent?.accuracy ?? 7} color="#ff6c92" />
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
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [agentPos, setAgentPos] = useState({ a: { x: 30, y: 50 }, b: { x: 70, y: 50 } });
  const [muted, setMuted] = useState(false);
  const [lastAction, setLastAction] = useState("SERVE");
  const [attackerIsA, setAttackerIsA] = useState(true);
  const [trainerInput, setTrainerInput] = useState("");
  const prevFlashRef = useRef<string | null>(null);
  const [log, setLog] = useState([
    "> SYSTEM: Match initialized",
    `> AGENT_A: ${agentA?.strategy ?? "Analyzing opponent..."}`,
    `> AGENT_B: ${agentB?.strategy ?? "Executing formation"}`,
    "> REFEREE: Rally in progress",
  ]);

  const sportActions = ["SMASH", "DRIVE", "DROP", "CLEAR", "LOB", "BLOCK", "SPECIAL", "SERVE"];
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setAttackerIsA(prev => !prev);
      setLastAction(sportActions[Math.floor(Math.random() * sportActions.length)]);
      setAgentPos((prev) => ({
        a: {
          x: Math.max(10, Math.min(45, prev.a.x + (Math.random() - 0.5) * 8)),
          y: Math.max(20, Math.min(80, prev.a.y + (Math.random() - 0.5) * 8)),
        },
        b: {
          x: Math.max(55, Math.min(90, prev.b.x + (Math.random() - 0.5) * 8)),
          y: Math.max(20, Math.min(80, prev.b.y + (Math.random() - 0.5) * 8)),
        },
      }));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Play SFX on each new flash event
  const flashes = ["SMASH!", "ACE!", "RALLY!", "POINT!"];
  useEffect(() => {
    if (muted) return;
    const current = flashes[tick % flashes.length];
    if (current !== prevFlashRef.current && tick > 0) {
      SFX_MAP[current]?.();
      prevFlashRef.current = current;
    }
  }, [tick, muted]);

  const handleTrainerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerInput.trim()) return;
    setLog((l) => [...l.slice(-20), `> TRAINER: ${trainerInput}`]);
    // Send to PartyKit room if connected as a player
    if (viewerSide) socket.sendCommand(trainerInput);
    setTrainerInput("");
  };

  const colorA = agentA?.color ?? "#8ff5ff";
  const colorB = agentB?.color ?? "#ff6c92";

  // Determine which side this viewer owns (for WebSocket join)
  const viewerSide: "a" | "b" | null =
    viewerWallet && agentA?.owner?.toLowerCase() === viewerWallet.toLowerCase() ? "a" :
    viewerWallet && agentB?.owner?.toLowerCase() === viewerWallet.toLowerCase() ? "b" :
    null;

  const playerConfig = viewerSide && (viewerSide === "a" ? agentA : agentB) ? {
    userId: viewerWallet!,
    agentId: (viewerSide === "a" ? agentA : agentB)!.id,
    agentName: (viewerSide === "a" ? agentA : agentB)!.name,
    agentColor: (viewerSide === "a" ? agentA : agentB)!.color,
    side: viewerSide,
    stats: {
      speed:    (viewerSide === "a" ? agentA : agentB)!.speed   ?? 7,
      power:    (viewerSide === "a" ? agentA : agentB)!.power   ?? 7,
      stamina:  (viewerSide === "a" ? agentA : agentB)!.stamina ?? 7,
      accuracy: (viewerSide === "a" ? agentA : agentB)!.accuracy?? 7,
    },
    strategy:     (viewerSide === "a" ? agentA : agentB)!.strategy   ?? "Balanced",
    risk:         (viewerSide === "a" ? agentA : agentB)!.risk        ?? "Balanced",
    specialMoves: [],
  } : null;

  const socket = useMatchSocket(isSport ? competitionId : "", playerConfig);

  // Sync log with WebSocket status messages
  useEffect(() => {
    if (socket.statusMessage && socket.statusMessage !== "Connecting...") {
      setLog(l => [...l.slice(-20), `> ${socket.statusMessage}`]);
    }
  }, [socket.statusMessage]);

  // Redirect to result page when match ends
  useEffect(() => {
    if (socket.status === "settled" && socket.winner) {
      const timer = setTimeout(() => {
        router.push(`/competitions/${competitionId}/result`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [socket.status, socket.winner, competitionId, router]);

  // Use real scores as base, animate small deltas for sport matches
  const displayScoreA = isSport ? (agentA?.score ?? 0) : agentA?.score ?? 0;
  const displayScoreB = isSport ? (agentB?.score ?? 0) : agentB?.score ?? 0;

  return (
    <div className="overflow-hidden h-screen flex flex-col bg-[#0c0e16] text-[#eeecfa]">
      <div className="scanline fixed inset-0 z-[60] opacity-10 pointer-events-none" />

      {/* ── Top nav ── */}
      <header className="shrink-0 h-12 bg-[#11131d] border-b border-[#8ff5ff]/20 flex items-center px-4 gap-4 z-50">
        <Link href="/challenges" className="text-[10px] font-mono uppercase tracking-widest text-[#464752] hover:text-[#aaaab6] transition-colors">
          ← Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#8ff5ff] rounded-full animate-ping" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#8ff5ff]">LIVE_MATCH</span>
        </div>
        <span className="text-[10px] font-mono text-[#464752] truncate hidden sm:block">{competitionTitle}</span>

        <div className="ml-auto flex items-center gap-1 bg-[#11131d] border border-[#8ff5ff]/20 p-0.5">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest bg-[#8ff5ff] text-[#005d63]">
            TACTICAL_LENS
          </div>
          <button
            onClick={() => router.push(`/competitions/${competitionId}/cinematic`)}
            className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-[#464752] hover:text-[#aaaab6] transition-colors"
          >
            CINEMATIC_VIEW
          </button>
        </div>

        <Link
          href={`/competitions/${competitionId}/bet`}
          className="border border-[#ff6c92]/40 text-[#ff6c92] px-3 py-1 font-mono text-[10px] uppercase hover:bg-[#ff6c92]/10 transition-colors"
        >
          Place_Bet
        </Link>

        {/* Mute toggle */}
        <button
          onClick={() => setMuted((m) => !m)}
          title={muted ? "Unmute SFX" : "Mute SFX"}
          className="border border-[#464752]/30 px-2 py-1 font-mono text-[10px] uppercase text-[#464752] hover:text-[#aaaab6] hover:bg-[#171924] transition-colors"
        >
          {muted ? "SFX_OFF" : "SFX_ON"}
        </button>
      </header>

      {/* ── Main 3-col grid ── */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">

        {/* Agent A */}
        <AgentPanel agent={agentA} side="a" tick={tick} />

        {/* Arena Canvas */}
        <div className="col-span-6 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #0d1020 0%, #0c0e16 100%)" }}>
          <div
            className="absolute inset-0"
            style={{ backgroundImage: "radial-gradient(circle, rgba(143,245,255,0.15) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
          />

          {/* Court */}
          <div className="absolute inset-8 border-2" style={{ borderColor: "rgba(143,245,255,0.3)" }} />
          <div className="absolute top-8 bottom-8 left-1/2 -translate-x-px border-l border-dashed" style={{ borderColor: "rgba(143,245,255,0.15)" }} />
          <div
            className="absolute top-8 bottom-8 left-1/2 -translate-x-px w-px"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(143,245,255,0.6) 20%, rgba(143,245,255,0.6) 80%, transparent)" }}
          />

          {/* Canvas: shuttlecock + player tokens + particles */}
          <SportCourtCanvas
            agentPosA={agentPos.a}
            agentPosB={agentPos.b}
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

          {/* Action flash */}
          {tick % 4 === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="font-['Space_Grotesk'] text-7xl font-black italic -skew-x-12 opacity-60 select-none"
                style={{ color: "#8ff5ff", textShadow: "0 0 40px #8ff5ff" }}
              >
                {flashes[tick % 4]}
              </div>
            </div>
          )}

          {/* Score HUD */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-6 z-20">
            <div className="text-center">
              <div className="font-['Space_Grotesk'] font-black text-3xl" style={{ color: colorA, textShadow: `0 0 20px ${colorA}` }}>
                {displayScoreA}
              </div>
              <div className="text-[8px] font-mono text-[#464752] uppercase">{agentA?.name.slice(0, 8) ?? "A"}</div>
            </div>
            <div className="text-[#464752] font-mono text-xs">VS</div>
            <div className="text-center">
              <div className="font-['Space_Grotesk'] font-black text-3xl" style={{ color: colorB, textShadow: `0 0 20px ${colorB}` }}>
                {displayScoreB}
              </div>
              <div className="text-[8px] font-mono text-[#464752] uppercase">{agentB?.name.slice(0, 8) ?? "B"}</div>
            </div>
          </div>

          {/* Status */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <span
              className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border"
              style={{ color: "#8ff5ff", borderColor: "rgba(143,245,255,0.4)", background: "rgba(143,245,255,0.1)" }}
            >
              <span className="inline-block w-1.5 h-1.5 bg-[#8ff5ff] rounded-full animate-ping mr-1.5 align-middle" />
              {competitionStatus.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Agent B */}
        <div className="col-span-3 bg-[#171924] border-l border-[#464752]/20 flex flex-col overflow-y-auto">
          <div className="border-b border-[#464752]/20">
            <div className="px-4 pt-3 pb-2 text-[9px] font-mono uppercase tracking-widest text-[#464752]">Defender_B</div>
            <div
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: "1/1", border: `2px solid ${colorB}66`, boxShadow: `0 0 20px ${colorB}33` }}
            >
              <img
                src={getAgentAvatar(agentB?.id ?? "", agentB?.archetype)}
                alt={agentB?.name ?? "Agent B"}
                className="w-full h-full object-cover"
                style={{ filter: "grayscale(30%) brightness(0.8) contrast(1.2)" }}
              />
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colorB}22 0%, transparent 60%)` }} />
              <div className="absolute bottom-0 left-0 w-full px-3 pb-2">
                <div className="font-['Bebas_Neue'] text-xl tracking-wider uppercase" style={{ color: colorB }}>
                  {agentB?.name ?? "TBD"}
                </div>
                <div className="text-[8px] font-mono uppercase" style={{ color: `${colorB}99` }}>
                  {agentB?.archetype ?? "—"}
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 rounded-full animate-ping" style={{ background: colorB, opacity: 0.6 }} />
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3 flex-1">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Score",  value: agentB ? `${agentB.score} pts` : "—" },
                { label: "Trades", value: agentB ? `${agentB.trades}` : "—" },
                { label: "PnL",    value: agentB ? `${agentB.pnlPct >= 0 ? "+" : ""}${agentB.pnlPct.toFixed(1)}%` : "—" },
                { label: "Energy", value: `${Math.min(95, 40 + (tick % 4) * 7)}%` },
              ].map((s) => (
                <div key={s.label} className="bg-[#11131d] border border-[#464752]/20 p-2">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">{s.label}</div>
                  <div className="font-mono text-sm font-bold text-[#eeecfa] mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752] mb-1">Momentum</div>
              <div className="h-2 bg-[#11131d] border border-[#464752]/20">
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${Math.min(95, 40 + (tick % 4) * 7)}%`, background: colorB, boxShadow: `0 0 10px ${colorB}` }}
                />
              </div>
            </div>
            <div className="space-y-2 mt-2">
              <StatBar label="SPD" value={agentB?.speed ?? 7} color="#8ff5ff" />
              <StatBar label="PWR" value={agentB?.power ?? 7} color="#ffe6aa" />
              <StatBar label="STA" value={agentB?.stamina ?? 7} color="#00ff87" />
              <StatBar label="ACC" value={agentB?.accuracy ?? 7} color="#ff6c92" />
            </div>
            {agentB && (
              <Link
                href={`/agents/${agentB.id}`}
                className="block mt-2 text-center text-[9px] font-mono uppercase tracking-widest text-[#464752] hover:text-[#aaaab6] transition-colors border border-[#464752]/20 py-1"
              >
                View_Profile →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Trainer Console ── */}
      <div className="shrink-0 bg-[#11131d] border-t border-[#8ff5ff]/20">
        {/* Command window countdown bar */}
        {socket.commandWindowOpen && (
          <div className="relative h-1 bg-[#11131d] overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#8ff5ff] transition-none"
              style={{
                width: "100%",
                animation: `shrink ${socket.commandWindowMs}ms linear forwards`,
              }}
            />
            <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
          </div>
        )}
        {socket.commandWindowOpen && viewerSide && (
          <div className="px-4 py-1 flex items-center gap-2 bg-[#8ff5ff]/08 border-b border-[#8ff5ff]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8ff5ff] animate-ping" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#8ff5ff]">
              Command Window Open — {(socket.commandWindowMs / 1000).toFixed(1)}s
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
          <form onSubmit={handleTrainerSubmit} className="flex items-stretch border-l border-[#8ff5ff]/20 w-80">
            <input
              value={trainerInput}
              onChange={(e) => setTrainerInput(e.target.value)}
              placeholder={socket.commandWindowOpen && viewerSide ? "Send command to your agent..." : "Enter trainer command..."}
              className="flex-1 bg-transparent px-4 text-xs font-mono text-[#eeecfa] placeholder:text-[#464752] outline-none"
            />
            <button
              type="submit"
              className="px-4 font-['Space_Grotesk'] font-black uppercase text-xs hover:brightness-110 transition-all"
              style={{
                background: socket.commandWindowOpen && viewerSide ? "#8ff5ff" : "#1a1d2b",
                color: socket.commandWindowOpen && viewerSide ? "#005d63" : "#464752",
              }}
            >
              EXECUTE_OP
            </button>
          </form>
        </div>
      </div>

      {/* ── Bottom betting strip ── */}
      <div
        className="shrink-0 border-t border-[#8ff5ff]/20 px-4 py-3 flex items-center gap-6"
        style={{ background: "rgba(11,13,22,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 bg-[#ff6c92] rounded-full animate-ping" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff6c92]">MARKET_LIVE</span>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/competitions/${competitionId}/bet?pick=a`}
            className="px-4 py-2 border font-mono text-xs uppercase hover:brightness-110 transition-colors"
            style={{ background: `${colorA}14`, borderColor: `${colorA}40`, color: colorA }}
          >
            {agentA?.name.slice(0, 8) ?? "Agent_A"} · {oddsA}x
          </Link>
          <Link
            href={`/competitions/${competitionId}/bet?pick=b`}
            className="px-4 py-2 border font-mono text-xs uppercase hover:brightness-110 transition-colors"
            style={{ background: `${colorB}14`, borderColor: `${colorB}40`, color: colorB }}
          >
            {agentB?.name.slice(0, 8) ?? "Agent_B"} · {oddsB}x
          </Link>
        </div>
        <div className="text-[10px] font-mono text-[#464752]">
          Pool: <span className="text-[#ffe6aa]">${totalBetUsdc.toFixed(2)}</span>
        </div>
        <Link
          href={`/competitions/${competitionId}/bet`}
          className="ml-auto bg-[#ff6c92] text-[#48001b] px-5 py-2 font-['Space_Grotesk'] font-black uppercase text-xs hover:skew-x-[-6deg] transition-all"
        >
          PLACE_STAKE →
        </Link>
      </div>
    </div>
  );
}
