"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CompetitionRow } from "./competition-row";
import { cx } from "./ui";

type Tab = "live" | "open" | "challenge" | "settled";

interface Agent {
  id: string; name: string; archetype: string; color: string;
  risk: string; winRate: string; wins: number; losses: number;
  comps: number; traits: string[];
}

interface ArenaTabsProps {
  live: any[];
  open: any[];
  settled: any[];
  agents: Agent[];
}

// Archetype cards — character select (Idea #2 from redesign)
const ARCHETYPES = [
  { key: "Momentum",      emoji: "🔥", desc: "Rides the wave. Buys breakouts, cuts fast.",    risk: "Aggressive", color: "#ff6b35" },
  { key: "Contrarian",    emoji: "🧊", desc: "Fades the crowd. Buys dips, sells rips.",        risk: "Moderate",   color: "#4ecdc4" },
  { key: "Whale Follower",emoji: "🐋", desc: "Copies big wallet moves in real time.",           risk: "Moderate",   color: "#45b7d1" },
  { key: "Arbitrage",     emoji: "⚡", desc: "Exploits price gaps between markets.",            risk: "Conservative", color: "#f7dc6f" },
  { key: "DeFi Yield",    emoji: "🌾", desc: "Optimises for yield. Slow and steady.",           risk: "Conservative", color: "#82e0aa" },
  { key: "Degen",         emoji: "🎲", desc: "High risk, maximum upside. YOLO energy.",         risk: "Aggressive", color: "#d35400" },
] as const;

function QuickChallenge({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = ARCHETYPES.find(a => a.key === selectedArchetype);

  const launch = async () => {
    if (!selectedArchetype || !selectedOpponent || !name.trim()) {
      setError("Pick an archetype, name your agent, and choose an opponent.");
      return;
    }
    setLoading(true); setError(null);
    try {
      const agentRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          archetype: selectedArchetype,
          strategy: `${selectedArchetype} strategy — adapts to live market conditions`,
          traits: chosen ? [chosen.risk, "Adaptive"] : ["Adaptive"],
          risk: chosen?.risk ?? "Moderate",
          color: chosen?.color ?? "#00d4aa",
          owner: "Arena User",
          bankroll: "1",
        }),
      });
      if (!agentRes.ok) throw new Error("Agent creation failed");
      const newAgent = await agentRes.json();

      const compRes = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengerAgentId: newAgent.id, targetAgentId: selectedOpponent }),
      });
      if (!compRes.ok) throw new Error("Challenge failed");
      const comp = await compRes.json();
      router.push(`/competitions/${comp.id}`);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Step 1: Pick archetype */}
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          1 · Pick your archetype
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ARCHETYPES.map(a => (
            <button
              key={a.key}
              onClick={() => setSelectedArchetype(a.key)}
              className={cx(
                "rounded-2xl border p-4 text-left transition active:scale-[0.97]",
                selectedArchetype === a.key
                  ? "border-opacity-100"
                  : "border-white/[0.06] bg-[var(--bg-card)] hover:border-white/20 hover:bg-[var(--bg-raised)]"
              )}
              style={selectedArchetype === a.key ? { borderColor: a.color, background: `${a.color}12` } : undefined}
            >
              <div className="text-2xl mb-2">{a.emoji}</div>
              <div className="text-sm font-bold text-white">{a.key}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1 leading-relaxed">{a.desc}</div>
              <div
                className="mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                style={{ color: a.color, background: `${a.color}18` }}
              >
                {a.risk}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Name */}
      {selectedArchetype && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            2 · Name your agent
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`e.g. ${selectedArchetype}Bot`}
            className="w-full rounded-xl border border-white/[0.08] bg-[var(--bg-card)] px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--teal)]/50 focus:outline-none transition"
          />
        </div>
      )}

      {/* Step 3: Pick opponent */}
      {selectedArchetype && name.length >= 2 && (
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            3 · Choose your opponent
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelectedOpponent(agent.id)}
                className={cx(
                  "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98]",
                  selectedOpponent === agent.id
                    ? "border-[var(--teal)]/40 bg-[var(--teal)]/8"
                    : "border-white/[0.06] bg-[var(--bg-card)] hover:border-white/15 hover:bg-[var(--bg-raised)]"
                )}
              >
                <div
                  className="h-7 w-7 flex-shrink-0 rounded-full"
                  style={{ background: agent.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">{agent.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {agent.archetype} · {agent.comps} bouts
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono font-bold text-white">
                    {agent.wins}W {agent.losses}L
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-[var(--red)]/25 bg-[var(--red)]/8 px-4 py-2.5 text-xs text-[var(--red)]">
          {error}
        </div>
      )}

      {/* Launch */}
      <button
        onClick={launch}
        disabled={loading || !selectedArchetype || !selectedOpponent || name.length < 2}
        className={cx(
          "w-full rounded-full py-3.5 text-sm font-bold transition",
          selectedArchetype && selectedOpponent && name.length >= 2
            ? "btn-primary"
            : "border border-white/10 text-[var(--text-muted)] cursor-not-allowed"
        )}
      >
        {loading ? "Launching…" : "⚡ Enter Arena"}
      </button>
    </div>
  );
}

export function ArenaTabsClient({ live, open, settled, agents }: ArenaTabsProps) {
  const [tab, setTab] = useState<Tab>("live");

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "live",      label: "Live",      count: live.length },
    { key: "open",      label: "Open",      count: open.length },
    { key: "challenge", label: "Challenge", },
    { key: "settled",   label: "Settled",   count: settled.length },
  ];

  const current =
    tab === "live"     ? live    :
    tab === "open"     ? open    :
    tab === "settled"  ? settled : [];

  return (
    <div>
      {/* Tab bar — scrollable on very narrow screens */}
      <div className="mb-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-center gap-0.5 border-b border-white/[0.06] sm:gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cx(
                "flex items-center gap-1 px-3 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap sm:gap-1.5 sm:px-4 sm:py-2.5 sm:text-sm",
                tab === t.key
                  ? "border-[var(--teal)] text-[var(--teal)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-white"
              )}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={cx(
                  "rounded-full px-1 py-0.5 text-[9px] font-mono sm:px-1.5 sm:text-[10px]",
                  tab === t.key
                    ? "bg-[var(--teal)]/15 text-[var(--teal)]"
                    : "bg-white/8 text-[var(--text-muted)]"
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "challenge" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <QuickChallenge agents={agents} />
          <div className="hidden lg:block space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">
              Recent battles
            </div>
            {settled.slice(0, 5).map(c => (
              <CompetitionRow key={c.id} competition={c} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {current.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-[var(--bg-card)] p-12 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                {tab === "live" ? "No live matches right now." :
                 tab === "open" ? "No open seats waiting for challengers." :
                 "No settled matches yet."}
              </p>
              {tab !== "settled" && (
                <button
                  onClick={() => setTab("challenge")}
                  className="btn-primary mt-4 inline-block px-5 py-2 text-sm"
                >
                  Start a match →
                </button>
              )}
            </div>
          ) : (
            current.map(c => <CompetitionRow key={c.id} competition={c} />)
          )}
        </div>
      )}
    </div>
  );
}
