"use client";

import { useState, useEffect } from "react";
import type { Competition } from "@/lib/arena-data";
import { CompetitionCardClient as CompetitionCard } from "@/components/arena/competition-card-client";

type FilterKey = "all" | "live" | "open" | "settled";

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All matches" },
  { key: "live", label: "Live" },
  { key: "open", label: "Open seats" },
  { key: "settled", label: "Settled" },
];

export function CompetitionFilters({
  competitions,
}: {
  competitions: Competition[];
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const filtered =
    activeFilter === "all"
      ? competitions
      : competitions.filter((c) => c.status === activeFilter);

  const counts = {
    all: competitions.length,
    live: competitions.filter((c) => c.status === "live").length,
    open: competitions.filter((c) => c.status === "open").length,
    settled: competitions.filter((c) => c.status === "settled").length,
  };

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setActiveFilter(filter.key)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              activeFilter === filter.key
                ? "bg-[var(--cyan-soft)] text-white"
                : "border border-white/10 bg-white/5 text-[var(--text-secondary)] hover:bg-white/[0.08]"
            }`}
          >
            {filter.label}
            <span className="ml-1.5 font-mono text-xs text-[var(--text-muted)]">
              {counts[filter.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-5">
        {filtered.length === 0 ? (
          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-8 text-center">
            <div className="text-sm text-[var(--text-muted)]">
              No {activeFilter} matches right now.
            </div>
          </div>
        ) : (
          filtered.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} />
          ))
        )}
      </div>
    </>
  );
}

// FIX 5.1: real countdown derived from startedAt + durationSeconds instead of
// parsing a static string that never updates.
export function LiveCountdown({
  targetText,
  status,
  startedAt,
  durationSeconds,
}: {
  targetText: string;
  status: Competition["status"];
  startedAt?: string | null;    // ISO string from DB
  durationSeconds?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Compute initial seconds remaining
  const computeRemaining = () => {
    if (startedAt && durationSeconds) {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      return Math.max(0, Math.round(durationSeconds - elapsed));
    }
    // Fallback: parse the static string
    return parseCountdown(targetText);
  };

  useEffect(() => {
    setMounted(true);
    setSeconds(computeRemaining());
  }, []);

  useEffect(() => {
    if (!mounted || status !== "live") return;
    // Re-sync every second
    const interval = setInterval(() => {
      setSeconds(computeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, [mounted, status, startedAt, durationSeconds]);

  if (!mounted) {
    return <span className="font-mono text-lg text-white">{targetText}</span>;
  }

  if (status === "settled") {
    return <span className="font-mono text-lg text-[var(--text-secondary)]">Settled</span>;
  }

  if (status === "open") {
    return <span className="font-mono text-lg text-[var(--gold)]">{targetText}</span>;
  }

  if (seconds <= 0) {
    return <span className="font-mono text-lg text-[var(--red)]">Settling…</span>;
  }

  return (
    <span className="font-mono text-lg text-white">
      {formatTime(seconds)}
      <span className="ml-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
        remaining
      </span>
    </span>
  );
}

export function AnimatedSpectators({ count }: { count: number }) {
  const [displayed, setDisplayed] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const duration = 1200;
    const steps = 30;
    const increment = count / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
      step += 1;
      current = Math.min(Math.round(increment * step), count);
      setDisplayed(current);

      if (step >= steps) {
        clearInterval(interval);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [count, mounted]);

  if (!mounted) {
    return <>{count}</>;
  }

  return <>{displayed}</>;
}

function parseCountdown(text: string): number {
  const trimmed = text.trim().toLowerCase();

  // "23:41 remaining" or "1:12:05 remaining"
  const timeMatch = trimmed.match(/(\d+):(\d+)(?::(\d+))?/);
  if (timeMatch) {
    const hours = timeMatch[3] ? Number(timeMatch[1]) : 0;
    const minutes = timeMatch[3] ? Number(timeMatch[2]) : Number(timeMatch[1]);
    const secs = timeMatch[3] ? Number(timeMatch[3]) : Number(timeMatch[2]);
    return hours * 3600 + minutes * 60 + secs;
  }

  // "12 min"
  const minMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*min/);
  if (minMatch) {
    return Math.round(Number(minMatch[1]) * 60);
  }

  return 0;
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
