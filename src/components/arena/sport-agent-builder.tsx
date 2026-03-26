"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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

  const toggleMove = useCallback((move: string) => {
    setForm((prev) => {
      const has = prev.specialMoves.includes(move);
      if (!has && prev.specialMoves.length >= 2) return prev;
      return {
        ...prev,
        specialMoves: has
          ? prev.specialMoves.filter((m) => m !== move)
          : [...prev.specialMoves, move],
      };
    });
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!form.name.trim()) {
        setError("Athlete name is required.");
        return;
      }
      if (form.name.trim().length < 3) {
        setError("Athlete name must be at least 3 characters.");
        return;
      }
      if (form.specialMoves.length === 0) {
        setError("Pick at least one special move.");
        return;
      }

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
            owner: "Arena Guest",
            wallet: "0x000...0000",
            // Sport-specific
            speed:    form.stats.speed,
            power:    form.stats.power,
            stamina:  form.stats.stamina,
            accuracy: form.stats.accuracy,
            specialMoves: form.specialMoves,
            type: "sport",
          }),
        });

        if (!res.ok) throw new Error("Failed to create athlete");

        setSubmitted(true);
        setTimeout(() => { router.push("/competitions"); }, 1200);
      } catch {
        setError("Failed to create athlete. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, router]
  );

  if (submitted) {
    return (
      <div className="glass-panel rounded-[1.6rem] p-6">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--green-soft)]">
            <svg className="h-8 w-8 text-[var(--green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-semibold text-white">{form.name} is ready</div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Your {form.archetype.toLowerCase()} athlete has been created. Redirecting to competitions…
            </p>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {form.specialMoves.map((move) => (
              <span key={move} className="rounded-full border border-[var(--teal)]/30 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--teal)]">
                {move}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-[1.6rem] p-6 space-y-5">
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
        Athlete builder
      </div>

      {/* Name */}
      <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <label htmlFor="agent-name" className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Athlete name
        </label>
        <input
          id="agent-name"
          type="text"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="e.g. Striker, Phantom, Apex…"
          maxLength={40}
          className="mt-2 w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>

      {/* Archetype */}
      <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Archetype</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {ARCHETYPES.map((arch) => (
            <button
              key={arch}
              type="button"
              onClick={() => updateField("archetype", arch)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium tracking-[0.1em] transition-colors ${
                form.archetype === arch
                  ? "bg-[var(--cyan-soft)] text-[var(--cyan)]"
                  : "border border-white/10 bg-white/5 text-[var(--text-secondary)] hover:bg-white/[0.08]"
              }`}
            >
              {arch}
            </button>
          ))}
        </div>
      </div>

      {/* Playing Style */}
      <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Playing Style</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLAYING_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => updateField("playingStyle", style)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors ${
                form.playingStyle === style
                  ? style === "Aggressive"
                    ? "bg-[var(--red-soft)] text-[var(--red)]"
                    : style === "Moderate"
                      ? "bg-[var(--gold-soft)] text-[var(--gold)]"
                      : "bg-[var(--cyan-soft)] text-[var(--cyan)]"
                  : "border border-white/10 bg-white/5 text-[var(--text-secondary)] hover:bg-white/[0.08]"
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Stat allocation */}
      <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Stat Allocation</div>
          <div
            className={`font-mono text-sm font-bold ${
              remainingPoints === 0 ? "text-[var(--green)]" : remainingPoints < 0 ? "text-[var(--red)]" : "text-[var(--gold)]"
            }`}
          >
            {remainingPoints} pts remaining
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <StatSlider
            label="Speed (SPD)"
            value={form.stats.speed}
            color="#66E3FF"
            remaining={remainingPoints}
            onChange={(v) => updateStat("speed", v)}
          />
          <StatSlider
            label="Power (PWR)"
            value={form.stats.power}
            color="#f59e0b"
            remaining={remainingPoints}
            onChange={(v) => updateStat("power", v)}
          />
          <StatSlider
            label="Stamina (STA)"
            value={form.stats.stamina}
            color="#22c55e"
            remaining={remainingPoints}
            onChange={(v) => updateStat("stamina", v)}
          />
          <StatSlider
            label="Accuracy (ACC)"
            value={form.stats.accuracy}
            color="#a78bfa"
            remaining={remainingPoints}
            onChange={(v) => updateStat("accuracy", v)}
          />
        </div>
      </div>

      {/* Special moves */}
      <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Special Moves</div>
          <div className="text-[10px] text-[var(--text-muted)]">
            {form.specialMoves.length}/2 selected
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SPECIAL_MOVES.map((move) => {
            const selected = form.specialMoves.includes(move);
            const disabled = !selected && form.specialMoves.length >= 2;
            return (
              <button
                key={move}
                type="button"
                disabled={disabled}
                onClick={() => toggleMove(move)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium tracking-[0.1em] transition-colors disabled:opacity-30 ${
                  selected
                    ? "border border-[var(--teal)]/50 bg-[var(--teal)]/15 text-[var(--teal)]"
                    : "border border-white/10 bg-white/5 text-[var(--text-secondary)] hover:bg-white/[0.08]"
                }`}
              >
                {selected && <span className="mr-1">✓</span>}
                {move}
              </button>
            );
          })}
        </div>
      </div>

      {/* Play style description */}
      <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <label htmlFor="play-style" className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Play Style (optional)
        </label>
        <textarea
          id="play-style"
          value={form.playStyle}
          onChange={(e) => updateField("playStyle", e.target.value)}
          placeholder="How does this athlete play? What's their approach to matches?"
          maxLength={200}
          rows={3}
          className="mt-2 w-full resize-none border-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-[var(--red)]/30 bg-[var(--red-soft)] px-4 py-3 text-sm text-[var(--red)]">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={submitting || remainingPoints < 0}
          className="inline-flex items-center justify-center rounded-full bg-[var(--cyan)] px-6 py-3 text-sm font-medium text-slate-950 shadow-[0_10px_30px_rgba(102,227,255,0.28)] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {submitting ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Creating…
            </>
          ) : (
            "Create athlete"
          )}
        </button>

        {form.name.trim() && (
          <div className="text-sm text-[var(--text-secondary)]">
            <span className="text-white">{form.name.trim()}</span>{" "}
            · {form.archetype} · {form.playingStyle}
          </div>
        )}
      </div>
    </form>
  );
}
