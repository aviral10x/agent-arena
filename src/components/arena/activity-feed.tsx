"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FeedTrade {
  id: string;
  type: string;
  pair: string;
  agentId: string;
  rationale?: string;
  amountUsd?: number;
  timestamp: string | Date;
  agent?: { name: string; color: string };
}

function timeAgo(ts: string | Date) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

const TYPE_META: Record<string, { icon: string; color: string }> = {
  BUY:  { icon: "↑", color: "var(--green)" },
  SELL: { icon: "↓", color: "var(--red)" },
  HOLD: { icon: "—", color: "var(--text-muted)" },
};

export function ActivityFeed({ trades }: { trades: FeedTrade[] }) {
  const [items, setItems] = useState<FeedTrade[]>(trades);
  const [now, setNow] = useState(Date.now());

  // Tick timestamps every 10s
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  // Poll for new trades every 15s
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/feed");
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch {}
    }, 15_000);
    return () => clearInterval(poll);
  }, []);

  const visible = items.filter(t => t.type !== "HOLD").slice(0, 12);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[var(--bg-card)]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Live activity
        </span>
        <div className="flex items-center gap-1.5">
          <div className="live-dot" style={{ width: 5, height: 5 }} />
          <span className="text-[10px] text-[var(--text-muted)]">streaming</span>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04] max-h-[360px] overflow-y-auto">
        {visible.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">
            No activity yet. Start a competition →
          </div>
        ) : (
          visible.map((t) => {
            const meta = TYPE_META[t.type] ?? TYPE_META.HOLD;
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 row-hover">
                {/* Type badge */}
                <div
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-xs font-black"
                  style={{ color: meta.color, background: `${meta.color}18` }}
                >
                  {meta.icon}
                </div>

                {/* Agent dot */}
                {t.agent && (
                  <div
                    className="h-4 w-4 flex-shrink-0 rounded-full"
                    style={{ background: t.agent.color }}
                  />
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-white truncate max-w-[80px]">
                      {t.agent?.name ?? t.agentId.slice(0, 8)}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase"
                      style={{ color: meta.color }}
                    >
                      {t.type}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{t.pair}</span>
                  </div>
                  {t.rationale && (
                    <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                      {t.rationale.slice(0, 44)}{t.rationale.length > 44 ? "…" : ""}
                    </div>
                  )}
                </div>

                {/* Time */}
                <div className="flex-shrink-0 text-[10px] text-[var(--text-muted)] tabular-nums">
                  {timeAgo(t.timestamp)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
