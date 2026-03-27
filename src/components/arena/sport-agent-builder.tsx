"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { playClick, playToggleOn, playToggleOff, playConfirm, playSuccess, playError, playGenerate } from "@/lib/sfx";

const ARCHETYPES = [
  "Net Dominator",
  "Counter Specialist",
  "Adaptive All-Rounder",
  "Endurance Baseliner",
  "Power Hitter",
  "Speed Demon",
] as const;

const PLAYING_STYLES = ["Aggressive", "Moderate", "Defensive"] as const;

const SPECIAL_MOVES = [
  "Thunder Smash",
  "Ghost Drop",
  "Net Kill",
  "Phantom Clear",
  "Mirror Drive",
  "Silk Drop",
  "Endurance Drive",
  "Adaptive Smash",
  "Lightning Drive",
  "Shadow Lob",
] as const;

const STAT_BUDGET = 32;
const STAT_MIN = 1;
const STAT_MAX = 10;

type Stats = { speed: number; power: number; stamina: number; accuracy: number };

const DEFAULT_STATS: Stats = { speed: 8, power: 8, stamina: 8, accuracy: 8 };

type FormState = {
  name: string;
  archetype: (typeof ARCHETYPES)[number];
  playStyle: string;
  playingStyle: (typeof PLAYING_STYLES)[number];
  stats: Stats;
  specialMoves: string[];
};

function StatSlider({
  label,
  value,
  color,
  remaining,
  onChange,
}: {
  label: string;
  value: number;
  color: string;
  remaining: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - STAT_MIN) / (STAT_MAX - STAT_MIN)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</span>
        <span className="font-mono text-sm font-bold text-white">{value}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: STAT_MAX - STAT_MIN + 1 }, (_, i) => i + STAT_MIN).map((v) => (
          <button
            key={v}
            type="button"
            disabled={v > value && remaining <= 0}
            onClick={() => onChange(v)}
            className="flex-1 rounded py-1 text-[9px] font-mono transition-colors disabled:opacity-30"
            style={{
              background: v <= value ? color + "33" : "rgba(255,255,255,0.05)",
              color: v <= value ? color : "rgba(255,255,255,0.3)",
              border: v === value ? `1px solid ${color}80` : "1px solid transparent",
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SportAgentBuilder() {
  const router = useRouter();
  const { address: walletAddress } = useWallet();

  const [form, setForm] = useState<FormState>({
    name: "",
    archetype: "Adaptive All-Rounder",
    playStyle: "",
    playingStyle: "Moderate",
    stats: { ...DEFAULT_STATS },
    specialMoves: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageGenError, setImageGenError] = useState<string | null>(null);
  const [moveImages, setMoveImages] = useState<Record<string, string>>(() => {
    // Hydrate from localStorage on first render
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem('arena_move_images');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const [generatingMoves, setGeneratingMoves] = useState<Set<string>>(new Set());

  const usedPoints = form.stats.speed + form.stats.power + form.stats.stamina + form.stats.accuracy;
  const remainingPoints = STAT_BUDGET - usedPoints;

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    []
  );

  const updateStat = useCallback((stat: keyof Stats, value: number) => {
    setForm((prev) => {
      const newStats = { ...prev.stats, [stat]: value };
      const used = newStats.speed + newStats.power + newStats.stamina + newStats.accuracy;
      if (used > STAT_BUDGET) return prev; // reject
      return { ...prev, stats: newStats };
    });
    setError(null);
  }, []);

  const generateImage = useCallback(async () => {
    if (!form.name.trim()) {
      setImageGenError("Enter an agent name first.");
      return;
    }
    playGenerate();
    setGeneratingImage(true);
    setImageGenError(null);
    try {
      const res = await fetch("/api/agents/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          archetype: form.archetype,
          playingStyle: form.playingStyle,
          stats: form.stats,
          specialMoves: form.specialMoves,
          sport: "badminton",
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      if (data.imageBase64) {
        setAvatarBase64(data.imageBase64);
      } else {
        throw new Error(data.error ?? "No image returned");
      }
    } catch (err: any) {
      setImageGenError(err.message ?? "Image generation failed");
    } finally {
      setGeneratingImage(false);
    }
  }, [form.name, form.archetype]);

  const generateMoveImage = useCallback(async (move: string) => {
    if (moveImages[move] || generatingMoves.has(move)) return;
    setGeneratingMoves(prev => new Set(prev).add(move));
    try {
      const res = await fetch(`/api/agents/move-image?name=${encodeURIComponent(move)}`);
      const data = await res.json();
      if (data.imageBase64) {
        setMoveImages(prev => {
          const next = { ...prev, [move]: data.imageBase64 };
          try { localStorage.setItem('arena_move_images', JSON.stringify(next)); } catch {}
          return next;
        });
      }
    } catch {}
    setGeneratingMoves(prev => { const s = new Set(prev); s.delete(move); return s; });
  }, [moveImages, generatingMoves]);

  const toggleMove = useCallback((move: string) => {
    setForm((prev) => {
      const has = prev.specialMoves.includes(move);
      if (!has && prev.specialMoves.length >= 2) return prev;
      const next = {
        ...prev,
        specialMoves: has
          ? prev.specialMoves.filter((m) => m !== move)
          : [...prev.specialMoves, move],
      };
      // Kick off image generation when move is selected
      if (!has) setTimeout(() => generateMoveImage(move), 0);
      return next;
    });
    setError(null);
  }, [generateMoveImage]);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!form.name.trim()) {
        playError();
        setError("Athlete name is required.");
        return;
      }
      if (form.name.trim().length < 3) {
        playError();
        setError("Athlete name must be at least 3 characters.");
        return;
      }
      if (form.specialMoves.length === 0) {
        playError();
        setError("Pick at least one special move.");
        return;
      }

      playConfirm();
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            strategy: form.playStyle || `${form.archetype} athlete`,
            archetype: form.archetype,
            description: form.playStyle || `${form.archetype} sport athlete`,
            traits: form.specialMoves,
            risk: form.playingStyle,
            bankroll: "0",
            color: "#66E3FF",
            owner: walletAddress || "Arena Guest",
            wallet: walletAddress || "0x0000000000000000000000000000000000000000",
            // Sport-specific
            speed:    form.stats.speed,
            power:    form.stats.power,
            stamina:  form.stats.stamina,
            accuracy: form.stats.accuracy,
            specialMoves: form.specialMoves,
            type: "sport",
            avatarUrl: avatarBase64 ? `data:image/png;base64,${avatarBase64}` : undefined,
          }),
        });

        if (!res.ok) throw new Error("Failed to create athlete");

        const newAgent = await res.json();
        playSuccess();
        setSubmitted(true);
        setTimeout(() => { router.push(`/challenges?myAgentId=${newAgent.id}`); }, 1200);
      } catch {
        playError();
        setError("Failed to create athlete. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, router, avatarBase64]
  );

  if (submitted) {
    return (
      <div className="bg-[#171924] border border-[#8ff5ff]/20 p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center border-2 border-[#8ff5ff]">
            <span className="material-symbols-outlined text-[#8ff5ff] text-4xl">check_circle</span>
          </div>
          <div>
            <div className="font-['Space_Grotesk'] text-2xl font-black text-[#8ff5ff] uppercase tracking-tight italic">
              {form.name} INITIALIZED
            </div>
            <p className="mt-2 text-sm font-mono text-[#aaaab6]">
              {form.archetype.toUpperCase()} athlete deployed. Redirecting to matchmaking…
            </p>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {form.specialMoves.map((move) => (
              <span
                key={move}
                className="border border-[#8ff5ff]/40 bg-[#8ff5ff]/10 px-3 py-1 text-xs uppercase tracking-widest text-[#8ff5ff] font-mono"
              >
                {move}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#171924] border border-[#8ff5ff]/20 p-6 space-y-6 shadow-[inset_0_1px_0_0_rgba(143,245,255,0.15)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#464752]/20 pb-4">
        <div>
          <span className="bg-[#8ff5ff] text-[#005d63] px-3 py-0.5 text-[10px] font-mono font-bold uppercase">
            {form.archetype.toUpperCase()}
          </span>
          <h2 className="font-['Space_Grotesk'] text-4xl font-black text-[#eeecfa] tracking-tighter uppercase mt-2 italic leading-none">
            {form.name || "NEW_AGENT"}
          </h2>
        </div>
        <div className="text-right">
          <div className="text-2xl font-['Space_Grotesk'] font-bold text-[#ffe6aa]">
            {STAT_BUDGET - remainingPoints} <span className="text-xs uppercase opacity-60">/ {STAT_BUDGET} pts</span>
          </div>
          <div className="text-[10px] text-[#aaaab6] font-mono mt-1 uppercase">BUDGET_USED</div>
        </div>
      </div>

      {/* Name */}
      <div className="bg-[#11131d] border-b border-[#8ff5ff]/40 px-0 py-2">
        <label htmlFor="agent-name" className="text-[10px] uppercase tracking-widest text-[#464752] font-mono block mb-1">
          Agent Designation
        </label>
        <input
          id="agent-name"
          type="text"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="e.g. STRIKER_X, PHANTOM_V2, APEX_01…"
          maxLength={40}
          className="w-full bg-transparent text-[#8ff5ff] font-mono text-sm outline-none placeholder:text-[#464752] uppercase tracking-widest"
        />
      </div>

      {/* Archetype */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[#464752] font-mono mb-3">Combat Chassis</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ARCHETYPES.map((arch) => (
            <button
              key={arch}
              type="button"
              onClick={() => { playClick(); updateField("archetype", arch); }}
              className="p-3 text-left transition-all border"
              style={{
                background: form.archetype === arch ? 'rgba(143,245,255,0.1)' : 'transparent',
                borderColor: form.archetype === arch ? '#8ff5ff' : 'rgba(70,71,82,0.3)',
                color: form.archetype === arch ? '#8ff5ff' : '#aaaab6',
              }}
            >
              <div className="text-[10px] font-mono uppercase font-bold">{arch}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Playing Style */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[#464752] font-mono mb-3">Operational Protocol</div>
        <div className="grid grid-cols-3 gap-3">
          {PLAYING_STYLES.map((style) => {
            const colors = {
              Aggressive: { active: '#ff6c92', border: '#ff6c92' },
              Moderate:   { active: '#ffe6aa', border: '#ffe6aa' },
              Defensive:  { active: '#8ff5ff', border: '#8ff5ff' },
            };
            const c = colors[style];
            const selected = form.playingStyle === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => { playClick(); updateField("playingStyle", style); }}
                className="p-3 border font-mono text-xs uppercase font-bold tracking-widest transition-all"
                style={{
                  background: selected ? `${c.active}22` : 'transparent',
                  borderColor: selected ? c.border : 'rgba(70,71,82,0.3)',
                  color: selected ? c.active : '#464752',
                }}
              >
                {style}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stat allocation */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-widest text-[#464752] font-mono">Neural Bandwidth Budget</div>
          <div
            className="font-mono text-[10px] font-bold"
            style={{ color: remainingPoints === 0 ? '#00ff87' : remainingPoints < 0 ? '#ff716c' : '#ffe6aa' }}
          >
            {remainingPoints} pts remaining
          </div>
        </div>
        {/* Budget bar (Stitch segmented style) */}
        <div className="bg-[#ffe6aa]/20 h-2 flex gap-[1px] mb-6">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-full"
              style={{
                background: i < Math.round((STAT_BUDGET - remainingPoints) / STAT_BUDGET * 10)
                  ? '#ffe6aa'
                  : 'rgba(35,37,50,0.8)',
              }}
            />
          ))}
        </div>
        <div className="space-y-6">
          {([
            { key: "speed" as const,    label: "Speed",    color: "#8ff5ff" },
            { key: "power" as const,    label: "Power",    color: "#ffe6aa" },
            { key: "stamina" as const,  label: "Stamina",  color: "#ff6c92" },
            { key: "accuracy" as const, label: "Accuracy", color: "#a78bfa" },
          ] as const).map(({ key, label, color }) => (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-xs text-[#eeecfa] font-bold uppercase tracking-widest">{label}</span>
                <span className="font-mono text-xs" style={{ color }}>{form.stats[key]} / {STAT_MAX}</span>
              </div>
              <div className="h-1 w-full bg-[#11131d] mb-2">
                <div
                  className="h-full transition-all"
                  style={{ width: `${((form.stats[key] - STAT_MIN) / (STAT_MAX - STAT_MIN)) * 100}%`, background: color, boxShadow: `0 0 8px ${color}` }}
                />
              </div>
              <div className="flex gap-1">
                {Array.from({ length: STAT_MAX - STAT_MIN + 1 }, (_, i) => i + STAT_MIN).map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={v > form.stats[key] && remainingPoints <= 0}
                    onClick={() => updateStat(key, v)}
                    className="flex-1 py-1 text-[9px] font-mono transition-colors disabled:opacity-30"
                    style={{
                      background: v <= form.stats[key] ? `${color}33` : 'rgba(255,255,255,0.04)',
                      color: v <= form.stats[key] ? color : 'rgba(255,255,255,0.2)',
                      border: v === form.stats[key] ? `1px solid ${color}80` : '1px solid transparent',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special moves */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-widest text-[#464752] font-mono">Loaded Abilities</div>
          <div className="text-[10px] text-[#464752] font-mono">{form.specialMoves.length}/2 selected</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SPECIAL_MOVES.map((move) => {
            const selected = form.specialMoves.includes(move);
            const disabled = !selected && form.specialMoves.length >= 2;
            const color = selected ? '#ffe6aa' : '#ff6c92';
            const imgB64 = moveImages[move];
            const imgLoading = generatingMoves.has(move);
            return (
              <button
                key={move}
                type="button"
                disabled={disabled}
                onClick={() => { form.specialMoves.includes(move) ? playToggleOff() : playToggleOn(); toggleMove(move); }}
                className="p-2.5 flex items-center gap-2.5 transition-all border disabled:opacity-30"
                style={{
                  background: selected ? `${color}0d` : 'transparent',
                  borderColor: selected ? `${color}66` : 'rgba(70,71,82,0.3)',
                }}
              >
                {/* AI image or placeholder */}
                <div
                  className="w-10 h-10 flex-shrink-0 overflow-hidden relative"
                  style={{
                    background: imgB64 ? 'transparent' : `${color}15`,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {imgB64 ? (
                    <img
                      src={`data:image/png;base64,${imgB64}`}
                      alt={move}
                      className="w-full h-full object-cover"
                      style={{ filter: selected ? 'none' : 'grayscale(0.6) brightness(0.7)' }}
                    />
                  ) : imgLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" className="opacity-25"/>
                        <path d="M4 12a8 8 0 018-8" stroke={color} strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        {selected
                          ? <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" fill={color} opacity="0.8"/>
                          : <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
                        }
                      </svg>
                    </div>
                  )}
                  {selected && (
                    <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 8px ${color}40` }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[10px] font-mono font-bold uppercase leading-tight"
                    style={{ color: selected ? color : '#aaaab6' }}
                  >
                    {move}
                  </div>
                </div>
                {selected && <div className="w-1.5 h-1.5 flex-shrink-0" style={{ background: color }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Play style description */}
      <div className="bg-[#11131d] p-4 border-l-2 border-[#8ff5ff]/30">
        <label htmlFor="play-style" className="text-[10px] uppercase tracking-widest text-[#464752] font-mono block mb-2">
          Tactical Profile (optional)
        </label>
        <textarea
          id="play-style"
          value={form.playStyle}
          onChange={(e) => updateField("playStyle", e.target.value)}
          placeholder="How does this agent compete? Describe their playstyle…"
          maxLength={200}
          rows={3}
          className="w-full resize-none bg-transparent text-sm leading-6 text-[#eeecfa] outline-none placeholder:text-[#464752] font-mono"
        />
      </div>

      {/* Image Generation */}
      <div className="border border-[#464752]/30 bg-[#11131d]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#464752]/20">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#464752] font-mono">Agent Portrait</div>
            <div className="text-[11px] text-[#aaaab6] font-mono mt-0.5">AI-generated cyberpunk avatar</div>
          </div>
          <button
            type="button"
            onClick={generateImage}
            disabled={generatingImage}
            className="flex items-center gap-2 px-4 py-2 border border-[#8ff5ff]/40 text-[#8ff5ff] font-mono text-[11px] uppercase tracking-widest transition-all hover:bg-[#8ff5ff]/10 hover:border-[#8ff5ff]/80 disabled:opacity-40"
          >
            {generatingImage ? (
              <>
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                {/* sparkle SVG */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z"/>
                  <path d="M5 14l.75 2.75L8.5 17.5l-2.75.75L5 21l-.75-2.75L1.5 17.5l2.75-.75L5 14z" opacity="0.6"/>
                </svg>
                {avatarBase64 ? "Regenerate" : "Generate Image →"}
              </>
            )}
          </button>
        </div>
        {avatarBase64 ? (
          <div className="p-4 flex gap-4 items-start">
            <div className="relative flex-shrink-0">
              <img
                src={`data:image/png;base64,${avatarBase64}`}
                alt={`${form.name} portrait`}
                className="w-24 h-24 object-cover border border-[#8ff5ff]/30"
                style={{ imageRendering: "auto" }}
              />
              <div className="absolute inset-0 border border-[#8ff5ff]/20 pointer-events-none" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono text-[#8ff5ff] uppercase tracking-widest mb-1">Portrait Locked</div>
              <div className="text-xs text-[#aaaab6] font-mono leading-relaxed">
                {form.name || "AGENT"} · {form.archetype}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-[#8ff5ff] rounded-full" />
                <span className="text-[9px] font-mono text-[#464752] uppercase tracking-widest">Will be saved with agent</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <div className="text-[10px] font-mono text-[#464752] uppercase tracking-widest">
              {imageGenError ? (
                <span className="text-[#ff716c]">ERROR: {imageGenError}</span>
              ) : (
                "No portrait generated · optional"
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="border border-[#ff716c]/30 bg-[#ff716c]/10 px-4 py-3 text-sm text-[#ff716c] font-mono">
          ERROR: {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || remainingPoints < 0}
        className="w-full bg-gradient-to-r from-[#ffe6aa] to-[#efc859] text-[#493800] py-4 font-['Space_Grotesk'] font-black text-xl uppercase tracking-tighter flex items-center justify-center gap-4 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,230,170,0.3)] disabled:opacity-50"
      >
        {submitting ? (
          <>
            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Initializing…
          </>
        ) : (
          <>
            Enter the Arena
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
