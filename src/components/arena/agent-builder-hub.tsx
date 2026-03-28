"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { SportAgentBuilderLazy } from "./sport-agent-builder-wrapper";
import { playClick, playSelect, playConfirm } from "@/lib/sfx";
import { getAgentAvatar } from "@/lib/agent-avatars";

type Agent = {
  id: string;
  name: string;
  archetype: string;
  color: string;
  speed: number;
  power: number;
  stamina: number;
  accuracy: number;
  specialMoves: string | string[];
  bio: string;
  owner: string;
};

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, Math.round((value / 10) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-[10px] font-mono uppercase tracking-widest text-[#464752]">{label}</div>
      <div className="flex-1 h-1.5 bg-[#11131d] relative">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}80` }}
        />
      </div>
      <div className="w-12 text-right font-mono text-xs" style={{ color }}>{value} / 10</div>
    </div>
  );
}

function AgentDetailPanel({ agent, onEnter }: { agent: Agent; onEnter: () => void }) {
  const moves: string[] = Array.isArray(agent.specialMoves)
    ? agent.specialMoves
    : (() => { try { return JSON.parse(agent.specialMoves as string); } catch { return []; } })();

  const totalStats = agent.speed + agent.power + agent.stamina + agent.accuracy;
  const portrait = (agent as any).avatarUrl || getAgentAvatar(agent.id, agent.archetype);

  return (
    <div className="bg-[#171924] border border-[#464752]/30 h-full flex flex-col" style={{ boxShadow: "inset 0 1px 0 0 rgba(143,245,255,0.08)" }}>

      {/* Agent header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#464752]/20">
        <div className="flex items-start justify-between gap-4 mb-3">
          {/* Portrait thumbnail */}
          <div
            className="w-20 h-24 shrink-0 overflow-hidden relative"
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% 80%, 80% 100%, 0 100%)",
              border: `1px solid ${agent.color || '#8ff5ff'}40`,
            }}
          >
            <img
              src={portrait}
              alt={agent.name}
              className="w-full h-full object-cover"
              style={{ filter: "brightness(0.85) contrast(1.1)" }}
            />
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(to top, ${agent.color || '#8ff5ff'}33 0%, transparent 60%)` }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="inline-block px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest mb-2"
              style={{ background: `${agent.color}22`, color: agent.color, border: `1px solid ${agent.color}40` }}
            >
              {agent.archetype}
            </div>
            <div className="font-['Space_Grotesk'] text-3xl font-black text-[#eeecfa] uppercase tracking-tight italic leading-none">
              {agent.name}
            </div>
            <div className="text-[10px] font-mono text-[#464752] mt-1 uppercase tracking-widest">
              ID: {agent.id.slice(0, 8).toUpperCase()}-ARENA
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-['Space_Grotesk'] text-2xl font-black" style={{ color: agent.color }}>
              {totalStats * 10}
            </div>
            <div className="text-[9px] font-mono text-[#464752] uppercase tracking-widest">XP TOTAL</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-4 border-b border-[#464752]/20 space-y-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-2">Combat Stats</div>
        <StatBar label="SPEED"    value={agent.speed}    color="#8ff5ff" />
        <StatBar label="POWER"    value={agent.power}    color="#ffe6aa" />
        <StatBar label="ACCURACY" value={agent.accuracy} color="#ff6c92" />
        <StatBar label="STAMINA"  value={agent.stamina}  color="#a78bfa" />
      </div>

      {/* Neural budget */}
      <div className="px-5 py-4 border-b border-[#464752]/20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752]">Neural Bandwidth Budget</div>
          <div className="font-mono text-[10px] text-[#ffe6aa]">{totalStats * 10} / 400 MHz</div>
        </div>
        <div className="h-2 bg-[#11131d] flex gap-[1px]">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-full"
              style={{
                background: i < Math.round((totalStats / 40) * 10)
                  ? '#ffe6aa'
                  : 'rgba(35,37,50,0.8)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Loaded abilities */}
      {moves.length > 0 && (
        <div className="px-5 py-4 border-b border-[#464752]/20">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-3">Loaded Abilities</div>
          <div className="space-y-2">
            {moves.map((move, i) => (
              <div
                key={move}
                className="flex items-center gap-3 bg-[#11131d] border border-[#464752]/20 px-3 py-2.5"
              >
                <div
                  className="w-7 h-7 flex items-center justify-center shrink-0"
                  style={{ background: i === 0 ? '#ff6c9222' : '#ffe6aa22' }}
                >
                  <span className="material-symbols-outlined text-sm" style={{ color: i === 0 ? '#ff6c92' : '#ffe6aa' }}>
                    flash_on
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: i === 0 ? '#ff6c92' : '#ffe6aa' }}>
                    {move}
                  </div>
                </div>
                <div className="ml-auto w-1.5 h-1.5 shrink-0" style={{ background: i === 0 ? '#ff6c92' : '#ffe6aa' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bio */}
      {agent.bio && (
        <div className="px-5 py-4 border-b border-[#464752]/20">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-2">Tactical Profile</div>
          <div className="text-xs font-mono text-[#aaaab6] leading-relaxed">{agent.bio}</div>
        </div>
      )}

      {/* CTA */}
      <div className="p-5 mt-auto">
        <button
          onClick={() => { playConfirm(); onEnter(); }}
          className="w-full bg-gradient-to-r from-[#8ff5ff] to-[#00deec] text-[#005d63] py-4 font-['Space_Grotesk'] font-black text-lg uppercase tracking-tight flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all"
          style={{ boxShadow: "0 0 20px rgba(143,245,255,0.2)" }}
        >
          Enter the Arena
          <span className="material-symbols-outlined font-bold">arrow_forward_ios</span>
        </button>
      </div>
    </div>
  );
}

function AgentRosterCard({
  agent,
  selected,
  onClick,
}: {
  agent: Agent;
  selected: boolean;
  onClick: () => void;
}) {
  const color = agent.color || "#8ff5ff";
  const portrait = (agent as any).avatarUrl || getAgentAvatar(agent.id, agent.archetype);

  return (
    <button
      type="button"
      onClick={() => { playSelect(); onClick(); }}
      className="relative overflow-hidden text-left w-full transition-all"
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)",
        border: selected ? `2px solid ${color}` : `1px solid ${color}30`,
        background: selected ? `${color}0d` : "rgba(17,19,29,0.6)",
        boxShadow: selected ? `0 0 20px ${color}22, inset 0 1px 0 0 ${color}20` : "none",
      }}
    >
      {/* Top color strip */}
      <div className="h-0.5 w-full" style={{ background: selected ? color : `${color}40` }} />

      {/* Portrait */}
      <div className="aspect-[3/4] relative overflow-hidden bg-[#000]">
        <img
          src={portrait}
          alt={agent.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          style={{ opacity: 0.75, filter: "brightness(0.8) contrast(1.1)" }}
        />
        {/* Color gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, ${color}44 0%, transparent 55%)` }}
        />
        {/* Selected glow border */}
        {selected && (
          <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 20px ${color}30` }} />
        )}
        {/* Bottom info */}
        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-[#000] to-transparent">
          <div className="font-['Bebas_Neue'] text-base leading-none uppercase" style={{ color }}>
            {agent.name}
          </div>
          <div className="text-[8px] font-mono uppercase mt-0.5" style={{ color: `${color}99` }}>
            TYPE: {agent.archetype.split(" ")[0]}
          </div>
          {/* Mini stats */}
          <div className="flex gap-1 mt-1.5">
            {[["SPD", agent.speed], ["PWR", agent.power], ["ACC", agent.accuracy], ["STA", agent.stamina]].map(([k, v]) => (
              <div key={String(k)} className="text-center">
                <div className="text-[7px] font-mono" style={{ color: `${color}70` }}>{k}</div>
                <div className="text-[9px] font-mono font-bold" style={{ color }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Selected indicator */}
        {selected && (
          <div className="absolute top-1.5 right-1.5">
            <div className="w-2 h-2" style={{ background: color }} />
          </div>
        )}
      </div>
    </button>
  );
}

export function AgentBuilderHub({ initialAgents }: { initialAgents?: Agent[] } = {}) {
  const router = useRouter();
  const { address: walletAddress } = useWallet();

  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [allAgents, setAllAgents] = useState<Agent[]>(initialAgents ?? []);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | "new">("new");

  useEffect(() => {
    // Always fetch all agents for the default roster
    if (!initialAgents?.length) {
      fetch('/api/agents')
        .then(r => r.json())
        .then((data: Agent[]) => { if (Array.isArray(data)) setAllAgents(data); })
        .catch(() => {});
    }
  }, [initialAgents]);

  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    let cancelled = false;
    fetch(`/api/agents?owner=${encodeURIComponent(walletAddress)}`)
      .then(r => r.json())
      .then((data: Agent[]) => {
        if (cancelled) return;
        if (Array.isArray(data)) setMyAgents(data);
        setLoadedOwner(walletAddress);
      })
      .catch(() => {
        if (!cancelled) setLoadedOwner(walletAddress);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  // Merge: user's agents first, then default agents (deduped)
  const ownedAgents = walletAddress && loadedOwner === walletAddress ? myAgents : [];
  const myIds = new Set(ownedAgents.map((agent) => agent.id));
  const defaultAgents = allAgents.filter((agent) => !myIds.has(agent.id));
  const agents = [...ownedAgents, ...defaultAgents];
  const isLoading = Boolean(walletAddress && loadedOwner !== walletAddress);

  const selectedAgent = agents.find(a => a.id === selectedId);

  function handleEnter() {
    if (selectedAgent) {
      router.push(`/challenges?myAgentId=${selectedAgent.id}`);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">

      {/* ── Left: Agent Roster ── */}
      <section className="col-span-12 lg:col-span-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-3 flex items-center justify-between">
          <span>Your Agents <span className="text-[#8ff5ff]">{"// "}{ownedAgents.length}</span></span>
          {isLoading && (
            <span className="text-[#464752] animate-pulse">loading…</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* New Agent slot — always first */}
          <button
            type="button"
            onClick={() => { playClick(); setSelectedId("new"); }}
            className="relative overflow-hidden text-left w-full transition-all"
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)",
              border: selectedId === "new" ? "2px solid #8ff5ff" : "2px dashed rgba(70,71,82,0.4)",
              background: selectedId === "new" ? "rgba(143,245,255,0.06)" : "transparent",
            }}
          >
            <div className="aspect-[3/4] flex flex-col items-center justify-center gap-2 p-3">
              <div
                className="w-12 h-12 flex items-center justify-center border font-['Space_Grotesk'] font-black text-2xl italic"
                style={{
                  borderColor: selectedId === "new" ? "#8ff5ff" : "rgba(70,71,82,0.4)",
                  color: selectedId === "new" ? "#8ff5ff" : "#464752",
                  background: selectedId === "new" ? "rgba(143,245,255,0.06)" : "transparent",
                }}
              >
                ?
              </div>
              <div
                className="text-[9px] font-mono uppercase tracking-widest text-center"
                style={{ color: selectedId === "new" ? "#8ff5ff" : "#464752" }}
              >
                NEW_AGENT
              </div>
              <div className="text-[8px] font-mono text-[#464752] text-center">SLOT_AVAILABLE</div>
            </div>
          </button>

          {/* User's own agents */}
          {ownedAgents.map((agent) => (
            <AgentRosterCard
              key={agent.id}
              agent={agent}
              selected={selectedId === agent.id}
              onClick={() => setSelectedId(agent.id)}
            />
          ))}
        </div>

        {/* Default Arena Agents — always visible */}
        {defaultAgents.length > 0 && (
          <>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mt-5 mb-3 flex items-center justify-between">
              <span>Arena Roster <span className="text-[#ffe6aa]">{"// "}{defaultAgents.length}</span></span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {defaultAgents.map((agent) => (
                <AgentRosterCard
                  key={agent.id}
                  agent={agent}
                  selected={selectedId === agent.id}
                  onClick={() => setSelectedId(agent.id)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Right: Detail or Builder ── */}
      <section className="col-span-12 lg:col-span-8">
        {selectedId === "new" || !selectedAgent ? (
          <SportAgentBuilderLazy />
        ) : (
          <AgentDetailPanel
            agent={selectedAgent}
            onEnter={handleEnter}
          />
        )}
      </section>
    </div>
  );
}
