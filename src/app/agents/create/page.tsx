use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";

const ARCHETYPES = [
  { id: "Net Dominator", label: "NET_DOMINATOR", icon: "swords" },
  { id: "Counter Specialist", label: "COUNTER_SPEC", icon: "shield" },
  { id: "Adaptive All-Rounder", label: "ADAPTIVE", icon: "balance" },
  { id: "Endurance Baseliner", label: "ENDURANCE", icon: "fitness_center" },
  { id: "Power Hitter", label: "POWER_HIT", icon: "bolt" },
  { id: "Speed Demon", label: "SPEED_DEMON", icon: "speed" },
];

const SPECIAL_MOVES = [
  { id: "Thunder Smash", icon: "bolt", color: "#ff6c92" },
  { id: "Ghost Drop", icon: "arrow_downward", color: "#8ff5ff" },
  { id: "Net Kill", icon: "close", color: "#ffd666" },
  { id: "Phantom Clear", icon: "open_with", color: "#8ff5ff" },
  { id: "Mirror Drive", icon: "sync_alt", color: "#ff6c92" },
  { id: "Silk Drop", icon: "feather", color: "#8ff5ff" },
  { id: "Endurance Drive", icon: "fitness_center", color: "#ffd666" },
  { id: "Adaptive Smash", icon: "auto_fix_high", color: "#8ff5ff" },
];

const PROTOCOLS = [
  { id: "Aggressive", label: "Aggressive", icon: "swords", desc: "High risk, high damage output focus." },
  { id: "Balanced", label: "Balanced", icon: "balance", desc: "Adaptable tactical versatility." },
  { id: "Defensive", label: "Defensive", icon: "shield", desc: "Mitigate impact, counter-strike readiness." },
];

const BUDGET = 32;

export default function CreateAgentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedArchetype, setSelectedArchetype] = useState(0);
  const [protocol, setProtocol] = useState("Aggressive");
  const [bio, setBio] = useState("");
  const [selectedMoves, setSelectedMoves] = useState<string[]>([]);
  const [stats, setStats] = useState({ speed: 5, power: 5, stamina: 5, accuracy: 5 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const usedPoints = stats.speed + stats.power + stats.stamina + stats.accuracy - 20;
  const remainingPoints = BUDGET - (usedPoints > 0 ? usedPoints : 0);

  function setStat(key: keyof typeof stats, val: number) {
    const newStats = { ...stats, [key]: Math.max(1, Math.min(10, val)) };
    const total = Object.values(newStats).reduce((a, b) => a + b, 0) - 4;
    if (total <= BUDGET) setStats(newStats);
  }

  function toggleMove(move: string) {
    setSelectedMoves(prev =>
      prev.includes(move) ? prev.filter(m => m !== move) : prev.length < 2 ? [...prev, move] : prev
    );
  }

  async function handleSubmit() {
    if (!name.trim()) { setError("Agent name required"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          archetype: ARCHETYPES[selectedArchetype].id,
          strategy: bio || `${protocol} play style. ${ARCHETYPES[selectedArchetype].id}.`,
          risk: protocol,
          bio,
          speed: stats.speed, power: stats.power, stamina: stats.stamina, accuracy: stats.accuracy,
          specialMoves: JSON.stringify(selectedMoves),
          traits: JSON.stringify([ARCHETYPES[selectedArchetype].label, protocol.toUpperCase()]),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const agent = await res.json();
      router.push(`/agents/${agent.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const statBars = [
    { key: "speed", label: "Speed" },
    { key: "power", label: "Power" },
    { key: "accuracy", label: "Accuracy" },
    { key: "stamina", label: "Stamina" },
  ] as const;

  return (
    <SiteChrome activeHref="/agents">
      <div className="fixed inset-0 pointer-events-none z-10 opacity-10" style={{
        background: "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.1) 50%), linear-gradient(90deg, rgba(255,0,0,0.02), rgba(0,255,0,0.01), rgba(0,0,255,0.02))",
        backgroundSize: "100% 4px, 3px 100%",
      }} />

      <main className="mt-16 p-6 md:p-8 min-h-screen grid grid-cols-12 gap-6 md:gap-8 max-w-[1400px] mx-auto">

        {/* Left: Agent Grid + Protocol */}
        <section className="col-span-12 lg:col-span-7">
          <div className="mb-8">
            <h1 className="text-5xl font-bold uppercase italic tracking-tighter" style={{ color: '#8ff5ff', fontFamily: 'Rajdhani, Space Grotesk' }}>
              Select Your Agent
            </h1>
            <p className="text-sm tracking-widest mt-2 border-l-4 pl-4 uppercase font-mono" style={{ borderColor: '#8ff5ff', color: '#aaaab6' }}>
              Initialize neural uplink with combat chassis
            </p>
          </div>

          {/* Agent Name */}
          <div className="mb-6">
            <label className="text-[10px] font-mono uppercase tracking-widest block mb-2" style={{ color: '#464752' }}>
              Agent_Designation
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ENTER_CALLSIGN..."
              className="w-full bg-transparent border-b-2 text-lg font-mono px-0 py-2 focus:outline-none uppercase tracking-widest"
              style={{ borderColor: '#8ff5ff', color: '#8ff5ff' }}
            />
          </div>

          {/* Archetype Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {ARCHETYPES.map((a, i) => {
              const selected = selectedArchetype === i;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedArchetype(i)}
                  className="relative cursor-pointer transition-all text-left group"
                  style={{
                    background: selected ? 'rgba(143,245,255,0.08)' : '#11131d',
                    border: `2px solid ${selected ? '#8ff5ff' : 'rgba(70,71,82,0.3)'}`,
                    boxShadow: selected ? '0 0 20px rgba(143,245,255,0.3)' : 'none',
                    padding: '16px',
                  }}
                >
                  <span className="material-symbols-outlined block mb-2" style={{ color: selected ? '#8ff5ff' : '#464752' }}>{a.icon}</span>
                  <div className="font-mono text-xs font-bold uppercase" style={{ color: selected ? '#8ff5ff' : '#aaaab6' }}>{a.label}</div>
                  {selected && <div className="absolute inset-0 border pointer-events-none" style={{ borderColor: 'rgba(143,245,255,0.2)' }} />}
                </button>
              );
            })}
          </div>

          {/* Play Style Cards */}
          <div className="mb-8">
            <h3 className="text-xl font-bold uppercase tracking-wider mb-4 italic" style={{ color: '#8ff5ff', fontFamily: 'Rajdhani' }}>Operational Protocol</h3>
            <div className="grid grid-cols-3 gap-4">
              {PROTOCOLS.map(p => {
                const active = protocol === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProtocol(p.id)}
                    className="p-4 cursor-pointer text-left transition-all relative overflow-hidden"
                    style={{
                      background: active ? 'rgba(143,245,255,0.05)' : '#11131d',
                      border: `1px solid ${active ? '#8ff5ff' : 'rgba(70,71,82,0.3)'}`,
                    }}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <span className="material-symbols-outlined" style={{ color: active ? '#8ff5ff' : '#464752', fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{p.icon}</span>
                      <div className="font-bold text-sm uppercase" style={{ color: active ? '#8ff5ff' : '#aaaab6', fontFamily: 'Chakra Petch' }}>{p.label}</div>
                    </div>
                    <div className="mt-2 text-[10px] uppercase leading-tight relative z-10" style={{ color: '#464752', fontFamily: 'Chakra Petch' }}>{p.desc}</div>
                    {active && <div className="absolute top-0 right-0 w-12 h-12 -translate-y-4 translate-x-4 skew-x-12" style={{ background: 'rgba(143,245,255,0.1)' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bio */}
          <div className="mb-4">
            <label className="text-[10px] font-mono uppercase tracking-widest block mb-2" style={{ color: '#464752' }}>Play_Style_Description</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="DESCRIBE_COMBAT_PROTOCOL..."
              rows={3}
              className="w-full bg-transparent border text-sm font-mono px-3 py-2 focus:outline-none resize-none"
              style={{ borderColor: 'rgba(70,71,82,0.3)', color: '#eeecfa' }}
            />
          </div>
        </section>

        {/* Right: Detail card */}
        <section className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="flex-1 flex flex-col relative overflow-hidden p-6" style={{
            background: '#171924',
            border: '1px solid rgba(143,245,255,0.2)',
            boxShadow: 'inset 0 1px 0 0 rgba(143,245,255,0.15)',
          }}>
            <div className="absolute top-0 right-0 w-32 h-64 -rotate-12 translate-x-16 -translate-y-16 pointer-events-none" style={{ background: 'rgba(143,245,255,0.04)' }} />

            <div className="relative z-10 flex flex-col h-full">
              {/* Agent header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="px-3 py-0.5 text-[10px] font-mono font-bold uppercase" style={{ background: '#8ff5ff', color: '#005d63' }}>
                    {ARCHETYPES[selectedArchetype].label}
                  </span>
                  <h2 className="text-6xl font-black uppercase italic leading-none mt-2 tracking-tighter" style={{ color: '#eeecfa', fontFamily: 'Rajdhani' }}>
                    {name || "UNNAMED_01"}
                  </h2>
                  <p className="text-xs font-mono mt-1" style={{ color: '#8ff5ff' }}>PROTOCOL: {protocol.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold" style={{ color: '#ffd666', fontFamily: 'Rajdhani' }}>
                    {Object.values(stats).reduce((a, b) => a + b, 0) * 10} <span className="text-xs opacity-60">XP</span>
                  </div>
                </div>
              </div>

              {/* Stat sliders */}
              <div className="space-y-5 mb-8">
                {statBars.map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#eeecfa', fontFamily: 'Chakra Petch' }}>{label}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setStat(key, stats[key] - 1)} className="w-5 h-5 flex items-center justify-center text-xs font-bold" style={{ color: '#8ff5ff', background: 'rgba(143,245,255,0.1)' }}>−</button>
                        <span className="font-mono text-xs w-8 text-center" style={{ color: '#8ff5ff' }}>{stats[key]} / 10</span>
                        <button onClick={() => setStat(key, stats[key] + 1)} className="w-5 h-5 flex items-center justify-center text-xs font-bold" style={{ color: '#8ff5ff', background: 'rgba(143,245,255,0.1)' }}>+</button>
                      </div>
                    </div>
                    <div className="h-1 w-full" style={{ background: '#11131d' }}>
                      <div className="h-full transition-all duration-300" style={{ width: `${stats[key] * 10}%`, background: '#8ff5ff', boxShadow: '0 0 8px #8ff5ff' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Budget bar */}
              <div className="p-4 mb-8" style={{ background: '#000000' }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[10px] font-mono uppercase font-bold" style={{ color: '#ffd666' }}>Neural Bandwidth Budget</div>
                  <div className="text-[10px] font-mono" style={{ color: '#ffd666' }}>{BUDGET - remainingPoints} / {BUDGET} MHz</div>
                </div>
                <div className="flex gap-[2px] h-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex-1 h-full" style={{
                      background: i < Math.round((BUDGET - remainingPoints) / BUDGET * 10) ? '#ffd666' : '#1d1f2b',
                    }} />
                  ))}
                </div>
                {remainingPoints <= 0 && <div className="text-[9px] font-mono mt-1" style={{ color: '#ff6c92' }}>BANDWIDTH_MAXED</div>}
              </div>

              {/* Special moves */}
              <div className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#eeecfa', fontFamily: 'Rajdhani' }}>Loaded Abilities <span className="text-[10px] font-mono" style={{ color: '#464752' }}>({selectedMoves.length}/2)</span></h3>
                <div className="grid grid-cols-2 gap-3">
                  {SPECIAL_MOVES.map(move => {
                    const active = selectedMoves.includes(move.id);
                    return (
                      <button
                        key={move.id}
                        onClick={() => toggleMove(move.id)}
                        className="border p-3 flex items-center gap-3 relative transition-all text-left"
                        style={{
                          borderColor: active ? move.color + '66' : 'rgba(70,71,82,0.2)',
                          background: active ? move.color + '0d' : 'transparent',
                        }}
                      >
                        <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: active ? move.color + '33' : 'rgba(70,71,82,0.1)' }}>
                          <span className="material-symbols-outlined text-sm" style={{ color: active ? move.color : '#464752', fontVariationSettings: "'FILL' 1" }}>{move.icon}</span>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase" style={{ color: active ? move.color : '#aaaab6', fontFamily: 'Chakra Petch' }}>{move.id}</div>
                        </div>
                        {active && <div className="absolute -top-1 -right-1 w-2 h-2" style={{ background: move.color }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error */}
              {error && <p className="text-xs font-mono mb-4" style={{ color: '#ff716c' }}>{error}</p>}

              {/* CTA */}
              <div className="mt-auto">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-5 font-black text-2xl uppercase tracking-tighter flex items-center justify-center gap-4 transition-all active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #ffd666, #efc859)',
                    color: '#6a5200',
                    boxShadow: '0 0 30px rgba(255,230,170,0.3)',
                    fontFamily: 'Space Grotesk, Bebas Neue',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "INITIALIZING..." : "Enter the Arena"}
                  <span className="material-symbols-outlined font-bold">arrow_forward_ios</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}