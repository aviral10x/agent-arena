"use client";
import { useEffect, useRef } from "react";
import type { TradeEvent } from "@/lib/arena-data";

function timeAgo(ts: string | Date | undefined): string {
  if (!ts) return "just now";
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export function TradeTimeline({ trades, title = "Trade timeline" }: { trades: TradeEvent[]; title?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll right when new trades arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0; // newest is first
    }
  }, [trades.length]);

  return (
    <div className="glass-panel overflow-hidden rounded-[1.6rem] p-4 sm:p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">{title}</div>
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--teal)]/20 bg-[var(--teal)]/8 px-2 py-0.5">
          <div className="live-dot" style={{ width: 5, height: 5 }} />
          <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--teal)]">Onchain</span>
        </div>
      </div>

      {trades.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="h-7 w-7 animate-pulse rounded-full bg-white/10" />
          <p className="text-sm text-[var(--text-muted)]">Waiting for first trade…</p>
        </div>
      )}

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
      >
        {trades.map((trade, i) => {
          const t = trade as any;
          const hasTx = !!t.txHash;
          const agentName = t.agentName || t.agentId?.slice(0, 8) + '…';

          return (
            <div
              key={`${trade.id}-${i}`}
              className={`flex-shrink-0 w-[220px] sm:w-[240px] rounded-[1.2rem] border bg-white/5 p-3 transition-colors ${
                hasTx ? 'border-[var(--teal)]/25' : 'border-white/10'
              }`}
            >
              {/* Agent + type + time */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate text-xs font-semibold text-white">{agentName}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                    trade.type === "BUY"  ? "bg-[var(--green-soft)] text-[var(--green)]" :
                    trade.type === "SELL" ? "bg-[var(--red-soft)] text-[var(--red)]" :
                    "bg-white/10 text-[var(--text-secondary)]"
                  }`}>{trade.type}</span>
                </div>
                <span className="shrink-0 font-mono text-[9px] text-[var(--text-muted)]">
                  {timeAgo(t.timestamp)}
                </span>
              </div>

              {/* Amount + pair */}
              <div className="font-mono text-sm text-white mb-1.5">
                {trade.amount} <span className="text-[var(--text-muted)]">·</span> {trade.pair}
              </div>

              {/* Price impact */}
              <div className="font-mono text-xs mb-2" style={{
                color: (trade.priceImpact || '').startsWith('+') ? 'var(--green)' : 'var(--red)'
              }}>
                {trade.priceImpact}
              </div>

              {/* Rationale — clamped to 2 lines */}
              <p className="text-[10px] leading-4 text-[var(--text-secondary)] line-clamp-2 mb-2">
                {trade.rationale}
              </p>

              {/* Tx link OR simulation label */}
              {hasTx && t.txExplorerUrl ? (
                <a
                  href={t.txExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--teal)]/20 bg-[var(--teal)]/8 px-2 py-1.5 hover:bg-[var(--teal)]/15 transition-colors group"
                >
                  <svg className="h-2.5 w-2.5 shrink-0 text-[var(--teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="font-mono text-[9px] text-[var(--teal)] truncate flex-1">
                    {t.txHash.slice(0, 8)}…{t.txHash.slice(-6)}
                  </span>
                  <svg className="h-2.5 w-2.5 shrink-0 text-[var(--teal)] opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]/40">
                  simulated · no tx
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
