"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAgentAvatar } from "@/lib/agent-avatars";
import { SFX_MAP } from "@/lib/sfx";
import { SportCourtCanvas } from "@/components/arena/sport-court-canvas";

type Agent = { id: string; name: string; color: string; archetype: string; score: number; pnlPct: number } | null;

type Props = {
  competitionId: string;
  competitionTitle: string;
  competitionStatus: string;
  agentA: Agent;
  agentB: Agent;
  totalBetUsdc: number;
  probA: number;
  probB: number;
  oddsA: string;
  oddsB: string;
};

export function CinematicMatchClient({
  competitionId,
  competitionTitle,
  competitionStatus,
  agentA,
  agentB,
  totalBetUsdc,
  probA,
  probB,
  oddsA,
  oddsB,
}: Props) {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [agentPos, setAgentPos] = useState({ a: { x: 25, y: 65 }, b: { x: 75, y: 35 } });
  const [lensMode, setLensMode] = useState<"3D" | "ORBIT">("3D");
  const [muted, setMuted] = useState(false);
  const [lastAction, setLastAction] = useState("SERVE");
  const [attackerIsA, setAttackerIsA] = useState(true);
  const prevFlashRef = useRef<string | null>(null);
  const flashes = ["SMASH!", "ACE!", "RALLY!", "POINT!"];
  const sportActions = ["SMASH", "DRIVE", "DROP", "CLEAR", "LOB", "BLOCK", "SPECIAL", "SERVE"];

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setAttackerIsA(prev => !prev);
      setLastAction(sportActions[Math.floor(Math.random() * sportActions.length)]);
      setAgentPos((prev) => ({
        a: {
          x: Math.max(5, Math.min(48, prev.a.x + (Math.random() - 0.5) * 10)),
          y: Math.max(55, Math.min(90, prev.a.y + (Math.random() - 0.5) * 8)),
        },
        b: {
          x: Math.max(52, Math.min(95, prev.b.x + (Math.random() - 0.5) * 10)),
          y: Math.max(10, Math.min(45, prev.b.y + (Math.random() - 0.5) * 8)),
        },
      }));
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  // SFX on each flash event
  useEffect(() => {
    if (muted) return;
    const current = flashes[tick % flashes.length];
    if (current !== prevFlashRef.current && tick > 0) {
      SFX_MAP[current]?.();
      prevFlashRef.current = current;
    }
  }, [tick, muted]);

  const colorA = agentA?.color ?? "#8ff5ff";
  const colorB = agentB?.color ?? "#ff6c92";

  const avatarA = agentA ? getAgentAvatar(agentA.id, agentA.archetype) : null;
  const avatarB = agentB ? getAgentAvatar(agentB.id, agentB.archetype) : null;

  const actionLog = [
    { time: "0:42", event: agentA ? `SMASH by ${agentA.name}` : "SMASH executed", color: colorA },
    { time: "0:38", event: agentB ? `Return by ${agentB.name}` : "Return executed", color: colorB },
    { time: "0:35", event: agentA ? `POINT: ${agentA.name}` : "POINT awarded", color: "#ffe6aa" },
    { time: "0:31", event: "Drop shot executed", color: "#464752" },
    { time: "0:28", event: "Rally continues", color: "#464752" },
  ];

  return (
    <div
      className="h-screen overflow-hidden flex flex-col relative text-[#eeecfa]"
      style={{ background: "radial-gradient(ellipse at center, #0d1020 0%, #08090f 60%, #000 100%)" }}
    >
      <div className="scanline fixed inset-0 z-[60] opacity-[0.07] pointer-events-none" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@700&display=swap');
        .perspective-court { perspective: 1200px; }
        .court-floor {
          transform: rotateX(65deg) translateZ(-50px);
          transform-style: preserve-3d;
        }
        .holographic-glow {
          box-shadow:
            inset 0 0 20px rgba(143,245,255,0.2),
            0 0 15px rgba(143,245,255,0.1),
            0 0 80px rgba(143,245,255,0.05);
        }
        .score-glow-a {
          text-shadow: 0 0 20px ${colorA}, 0 0 40px ${colorA}80, 0 0 80px ${colorA}40;
        }
        .score-glow-b {
          text-shadow: 0 0 20px ${colorB}, 0 0 40px ${colorB}80, 0 0 80px ${colorB}40;
        }
        .glitch-hover:hover {
          animation: glitch 0.3s steps(2) forwards;
        }
        @keyframes glitch {
          0%  { clip-path: polygon(0 0, 100% 0, 100% 33%, 0 33%); transform: translate(-2px, 0); }
          33% { clip-path: polygon(0 33%, 100% 33%, 100% 66%, 0 66%); transform: translate(2px, 0); }
          66% { clip-path: polygon(0 66%, 100% 66%, 100% 100%, 0 100%); transform: translate(-1px, 0); }
          100% { clip-path: none; transform: none; }
        }
      `}</style>

      {/* ── Top nav ── */}
      <header className="shrink-0 h-12 bg-[#11131d]/80 border-b border-[#8ff5ff]/20 flex items-center px-4 gap-4 z-50 backdrop-blur-xl">
        <Link
          href={`/competitions/${competitionId}`}
          className="text-[10px] font-mono uppercase tracking-widest text-[#464752] hover:text-[#aaaab6] transition-colors"
        >
          ← Back
        </Link>

        {/* ARENA_OS logo */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border border-[#8ff5ff]/60 flex items-center justify-center">
            <div className="w-2 h-2 bg-[#8ff5ff]" />
          </div>
          <span className="font-['Space_Grotesk'] font-black text-xs uppercase tracking-widest text-[#8ff5ff]">
            ARENA_OS
          </span>
        </div>

        <span className="text-[#464752]/40">|</span>
        <span className="text-[10px] font-mono text-[#464752] truncate hidden sm:block">{competitionTitle}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Lens switcher */}
          <div className="flex items-center gap-1 bg-[#11131d] border border-[#8ff5ff]/20 p-0.5">
            <button
              onClick={() => router.push(`/competitions/${competitionId}/live`)}
              className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-[#464752] hover:text-[#aaaab6] transition-colors"
            >
              TACTICAL
            </button>
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest bg-[#8ff5ff] text-[#005d63] font-bold">
              CINEMATIC
            </div>
          </div>

          {/* Connect wallet */}
          <button className="border border-[#8ff5ff]/30 px-3 py-1 text-[10px] font-mono uppercase text-[#8ff5ff] hover:bg-[#8ff5ff]/10 transition-colors">
            CONNECT_WALLET
          </button>
        </div>
      </header>

      {/* ── Score HUD center ── */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30">
        <div
          className="flex items-stretch gap-0 border-b-2 border-[#8ff5ff]"
          style={{
            background: "rgba(35,37,50,0.6)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Agent A score */}
          <div className="px-8 py-3 text-center">
            <div
              className="font-['Rajdhani',_'Space_Grotesk'] font-bold text-7xl leading-none score-glow-a"
              style={{ color: colorA, fontFamily: "Rajdhani, 'Space Grotesk', sans-serif" }}
            >
              {agentA?.score ?? 0}
            </div>
            <div className="text-[9px] font-mono text-[#464752] uppercase mt-1 tracking-widest">
              {agentA?.name ?? "Agent_A"}
            </div>
          </div>

          {/* Divider + rally info */}
          <div className="px-4 py-3 flex flex-col items-center justify-center border-l border-r border-[#8ff5ff]/20">
            <div className="font-mono text-2xl text-[#464752] leading-none">:</div>
            <div className="text-[8px] font-mono text-[#464752] mt-1">RALLY_{tick % 10 + 1}</div>
            <div
              className="text-[8px] font-mono uppercase mt-0.5"
              style={{ color: competitionStatus === "live" ? "#8ff5ff" : "#ffe6aa" }}
            >
              {competitionStatus}
            </div>
          </div>

          {/* Agent B score */}
          <div className="px-8 py-3 text-center">
            <div
              className="font-['Rajdhani',_'Space_Grotesk'] font-bold text-7xl leading-none score-glow-b"
              style={{ color: colorB, fontFamily: "Rajdhani, 'Space Grotesk', sans-serif" }}
            >
              {agentB?.score ?? 0}
            </div>
            <div className="text-[9px] font-mono text-[#464752] uppercase mt-1 tracking-widest">
              {agentB?.name ?? "Agent_B"}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3D Court ── */}
      <div className="flex-1 relative overflow-hidden perspective-court">
        <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: "80px" }}>
          <div
            className="court-floor relative holographic-glow"
            style={{
              width: "1200px",
              height: "700px",
              background: "linear-gradient(to bottom, #0a1a2a 0%, #0d2035 50%, #081520 100%)",
              border: "2px solid rgba(143,245,255,0.3)",
              backgroundImage: `
                radial-gradient(circle at 2px 2px, rgba(143,245,255,0.15) 1px, transparent 0)
              `,
              backgroundSize: "40px 40px",
            }}
          >
            {/* Court lines */}
            <div className="absolute inset-6 border border-[#8ff5ff]/20" />
            <div className="absolute inset-6" style={{ borderTop: "2px solid rgba(143,245,255,0.25)" }} />
            <div className="absolute bottom-6 left-6 right-6" style={{ borderBottom: "2px solid rgba(143,245,255,0.25)" }} />
            {/* Center net */}
            <div
              className="absolute top-6 bottom-6 left-1/2 -translate-x-px"
              style={{
                width: "2px",
                background: "linear-gradient(to bottom, transparent, rgba(143,245,255,0.8) 20%, rgba(143,245,255,0.8) 80%, transparent)",
              }}
            />
            <div className="absolute top-6 bottom-6 left-1/2 -translate-x-px border-l border-dashed border-[#8ff5ff]/10" />
            {/* Service boxes */}
            <div className="absolute top-6 bottom-6 left-[25%] border-l border-[#8ff5ff]/10" />
            <div className="absolute top-6 bottom-6 right-[25%] border-r border-[#8ff5ff]/10" />
            <div className="absolute top-1/2 left-6 right-6 border-t border-[#8ff5ff]/10" />

            {/* Canvas: shuttlecock + player tokens + particles */}
            <SportCourtCanvas
              agentPosA={agentPos.a}
              agentPosB={agentPos.b}
              colorA={colorA}
              colorB={colorB}
              avatarA={avatarA}
              avatarB={avatarB}
              nameA={agentA?.name ?? "Agent_A"}
              nameB={agentB?.name ?? "Agent_B"}
              lastAction={lastAction}
              tick={tick}
              attackerIsA={attackerIsA}
            />
          </div>
        </div>
      </div>

      {/* ── Left overlay: action log + metrics ── */}
      <div className="absolute left-4 top-20 bottom-16 w-64 z-20 flex flex-col gap-3 overflow-hidden pointer-events-none">
        {/* Action log */}
        <div
          className="border-l-2 border-[#8ff5ff] pl-3 pr-3 py-3"
          style={{ background: "rgba(17,19,29,0.85)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 bg-[#8ff5ff] rounded-full animate-ping" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#8ff5ff]">Action_Log</span>
          </div>
          <div className="space-y-1.5">
            {actionLog.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-[#464752] shrink-0 w-8">{e.time}</span>
                <span className="text-[9px] font-mono truncate" style={{ color: e.color }}>{e.event}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Match metrics */}
        <div
          className="border-l-2 border-[#464752]/40 pl-3 pr-3 py-3"
          style={{ background: "rgba(17,19,29,0.85)", backdropFilter: "blur(16px)" }}
        >
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752] mb-3">Match_Metrics</div>
          <div className="space-y-2.5">
            {[
              {
                label: "Score Lead",
                a: agentA?.score ?? 0,
                b: agentB?.score ?? 0,
                colorA,
                colorB,
              },
              {
                label: "Win Prob",
                a: probA,
                b: probB,
                colorA,
                colorB,
              },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-[8px] font-mono text-[#464752] mb-1 uppercase">{m.label}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono w-5 text-right" style={{ color: m.colorA }}>{m.a}</span>
                  <div className="flex-1 flex" style={{ height: "4px", gap: "1px" }}>
                    <div
                      style={{
                        width: `${Math.min(100, (m.a / Math.max(1, m.a + m.b)) * 100)}%`,
                        background: m.colorA,
                        height: "100%",
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        background: m.colorB,
                        height: "100%",
                        opacity: 0.5,
                      }}
                    />
                  </div>
                  <span className="text-[8px] font-mono w-5" style={{ color: m.colorB }}>{m.b}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right overlay: live odds + bet slip ── */}
      <div className="absolute right-4 top-20 bottom-16 w-72 z-20 flex flex-col gap-3">
        {/* Live odds */}
        <div
          className="p-4"
          style={{
            background: "rgba(17,19,29,0.85)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,108,146,0.2)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">Live_Odds</span>
            <span className="w-1.5 h-1.5 bg-[#ff6c92] rounded-full animate-ping" />
          </div>
          <div className="space-y-2">
            {([
              { agent: agentA, prob: probA, odds: oddsA, avatar: avatarA, pick: "a" },
              { agent: agentB, prob: probB, odds: oddsB, avatar: avatarB, pick: "b" },
            ] as const).map((o, i) => (
              <Link
                key={i}
                href={`/competitions/${competitionId}/bet?pick=${o.pick}`}
                className="block"
              >
                <div
                  className="flex items-center justify-between p-2.5 transition-colors hover:opacity-90"
                  style={{
                    borderLeft: `3px solid ${o.agent?.color ?? "#464752"}`,
                    background: `${o.agent?.color ?? "#464752"}10`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {o.avatar && (
                      <div className="w-7 h-7 overflow-hidden shrink-0"
                        style={{ clipPath: "polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%)" }}>
                        <img src={o.avatar} alt={o.agent?.name} className="w-full h-full object-cover"
                          style={{ filter: "brightness(0.8)" }} />
                      </div>
                    )}
                    <div>
                      <div className="text-[9px] font-mono uppercase" style={{ color: o.agent?.color ?? "#464752" }}>
                        {o.agent?.name.slice(0, 12) ?? (i === 0 ? "Agent_A" : "Agent_B")}
                      </div>
                      <div className="font-['Rajdhani',_sans-serif] text-base font-bold text-[#eeecfa]"
                        style={{ fontFamily: "Rajdhani, sans-serif" }}>
                        {o.odds}x
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-mono text-[#464752] uppercase">Win Prob</div>
                    <div className="font-mono text-sm font-bold text-[#eeecfa]">{o.prob}%</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Open bet slip CTA */}
          <Link
            href={`/competitions/${competitionId}/bet`}
            className="block mt-3 bg-[#ff6c92] text-[#48001b] px-4 py-3 font-['Space_Grotesk'] font-black uppercase text-sm text-center glitch-hover transition-all hover:skew-x-[-6deg]"
          >
            OPEN_BET_SLIP →
          </Link>

          <div className="mt-3 pt-3 border-t border-[#464752]/20 flex items-center justify-between">
            <div className="text-[9px] font-mono text-[#464752]">
              Pool: <span className="text-[#ffe6aa] font-bold">${totalBetUsdc.toFixed(2)}</span>
            </div>
            {/* Spectator avatars */}
            <div className="flex -space-x-1.5">
              {[colorA, colorB, "#ffe6aa", "#49f3a6"].map((c, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full border border-[#11131d] flex items-center justify-center text-[7px] font-mono"
                  style={{ background: `${c}40`, color: c }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              <div className="w-5 h-5 rounded-full border border-[#11131d] bg-[#171924] flex items-center justify-center text-[7px] font-mono text-[#464752]">
                +9
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom controls ── */}
      <div
        className="shrink-0 border-t border-[#8ff5ff]/20 px-4 py-2.5 flex items-center gap-3 z-50"
        style={{ background: "rgba(11,13,22,0.92)", backdropFilter: "blur(16px)" }}
      >
        {/* 3D lens / Orbit toggle */}
        <div className="flex items-center gap-0 bg-[#11131d] border border-[#464752]/30 overflow-hidden">
          <button
            onClick={() => setLensMode("3D")}
            className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
              lensMode === "3D"
                ? "bg-[#8ff5ff] text-[#005d63] font-bold"
                : "text-[#464752] hover:text-[#aaaab6]"
            }`}
          >
            3D_LENS
          </button>
          <button
            onClick={() => setLensMode("ORBIT")}
            className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
              lensMode === "ORBIT"
                ? "bg-[#8ff5ff] text-[#005d63] font-bold"
                : "text-[#464752] hover:text-[#aaaab6]"
            }`}
          >
            ORBIT
          </button>
        </div>

        {/* Cinematic mode indicator */}
        <div
          className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest border"
          style={{
            background: "rgba(255,108,146,0.08)",
            borderColor: "rgba(255,108,146,0.3)",
            color: "#ff6c92",
          }}
        >
          ● CINEMATIC_MODE
        </div>

        <button
          onClick={() => router.push(`/competitions/${competitionId}/live`)}
          className="border border-[#464752]/30 px-4 py-1.5 text-[10px] font-mono uppercase text-[#464752] hover:text-[#aaaab6] hover:bg-[#171924] transition-colors"
        >
          TACTICAL_MODE
        </button>

        <div className="ml-auto flex items-center gap-2 text-[#464752]">
          <button className="w-7 h-7 border border-[#464752]/30 flex items-center justify-center text-xs font-mono hover:text-[#aaaab6] transition-colors">−</button>
          <span className="text-[10px] font-mono text-[#aaaab6] w-8 text-center">100%</span>
          <button className="w-7 h-7 border border-[#464752]/30 flex items-center justify-center text-xs font-mono hover:text-[#aaaab6] transition-colors">+</button>
          <div className="w-px h-4 bg-[#464752]/40 mx-1" />
          <Link
            href={`/competitions/${competitionId}`}
            className="border border-[#464752]/30 px-3 py-1.5 text-[10px] font-mono uppercase text-[#464752] hover:text-[#aaaab6] hover:bg-[#171924] transition-colors"
          >
            ↑ SHARE
          </Link>
          <button
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Unmute SFX" : "Mute SFX"}
            className="border border-[#464752]/30 px-3 py-1.5 text-[10px] font-mono uppercase transition-colors"
            style={{ color: muted ? "#464752" : "#8ff5ff", borderColor: muted ? "rgba(70,71,82,0.3)" : "rgba(143,245,255,0.3)" }}
          >
            {muted ? "SFX_OFF" : "♪ SFX"}
          </button>
        </div>
      </div>
    </div>
  );
}
