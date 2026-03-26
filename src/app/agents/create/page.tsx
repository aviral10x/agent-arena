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