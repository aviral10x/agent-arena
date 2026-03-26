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