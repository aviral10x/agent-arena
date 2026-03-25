"use client";
import type { TradeEvent } from "@/lib/arena-data";

function timeAgo(ts: string | Date | undefined): string {
  if (!ts) return "just now";
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function TxLink({ txHash, txExplorerUrl }: { txHash?: string | null; txExplorerUrl?: string | null }) {
  if (!txHash || !txExplorerUrl) return (
    <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]/40">simulated</span>
  );
  return (
    <a href={txExplorerUrl} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1 rounded-lg border border-[var(--teal)]/20 bg-[var(--teal)]/8 px-2 py-1 hover:bg-[var(--teal)]/15 transition-colors"
      onClick={e => e.stopPropagation()}>
      <svg className="h-2.5 w-2.5 shrink-0 text-[var(--teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      <span className="font-mono text-[9px] text-[var(--teal)]">{txHash.slice(0,8)}…</span>
      <svg className="h-2.5 w-2.5 shrink-0 text-[var(--teal)]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

interface TradeTimelineProps {
  trades: TradeEvent[];
  title?: string;
  vertical?: boolean;       // vertical scrollable list (default for dashboard)
  maxHeight?: string;       // css max-height for vertical mode
}

export function TradeTimeline({
  trades,
  title = "Trade Timeline",
  vertical = false,
  maxHeight = "480px",
}: TradeTimelineProps) {
  const hasTx = trades.some((t: any) => t.txHash);

  // ── VERTICAL (dashboard mode) — used on competition detail page ──
  if (vertical) {
    return (
      <div className="glass-panel flex flex-col overflow-hidden rounded-[1.6rem] h-full">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            {title}
          </div>
          <div className="flex items-center gap-2">
            {hasTx && (
              <div className="flex items-center gap-1 rounded-full border border-[var(--teal)]/20 bg-[var(--teal)]/8 px-2 py-0.5">
                <div className="live-dot" style={{ width: 5, height: 5 }} />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--teal)]">Onchain</span>
              </div>
            )}
            <span className="text-[10px] text-[var(--text-muted)]">{trades.length} txns</span>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight }}>
          {trades.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
              <p className="text-sm text-[var(--text-muted)]">Waiting for first trade…</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {trades.map((trade, i) => {
                const t = trade as any;
                return (
                  <div key={`${trade.id}-${i}`} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    {/* Row 1: agent + type + time */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[100px]">
                        {t.agentName || t.agentId?.slice(0, 8)}
                      </span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                        trade.type === "BUY"  ? "bg-[var(--green-soft)] text-[var(--green)]" :
                        trade.type === "SELL" ? "bg-[var(--red-soft)] text-[var(--red)]" :
                        "bg-white/10 text-[var(--text-secondary)]"
                      }`}>{trade.type}</span>
                      <span className="ml-auto shrink-0 font-mono text-[9px] text-[var(--text-muted)]">
                        {timeAgo(t.timestamp)}
                      </span>
                    </div>

                    {/* Row 2: amount·pair + impact */}
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-mono text-xs text-white truncate">
                        {trade.amount} <span className="text-[var(--text-muted)]">·</span> {trade.pair}
                      </span>
                      <span className="shrink-0 font-mono text-[10px]" style={{
                        color: (trade.priceImpact || '').startsWith('+') ? 'var(--green)' : 'var(--red)'
                      }}>{trade.priceImpact}</span>
                    </div>

                    {/* Row 3: rationale */}
                    <p className="text-[10px] leading-4 text-[var(--text-secondary)] line-clamp-2 mb-2">
                      {trade.rationale}
                    </p>

                    {/* Row 4: tx link */}
                    <TxLink txHash={t.txHash} txExplorerUrl={t.txExplorerUrl} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── HORIZONTAL (legacy arena page / embedded use) ───────────────
  return (
    <div className="glass-panel overflow-hidden rounded-[1.6rem] p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">{title}</div>
        {hasTx && (
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--teal)]/20 bg-[var(--teal)]/8 px-2 py-0.5">
            <div className="live-dot" style={{ width: 5, height: 5 }} />
            <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--teal)]">Onchain</span>
          </div>
        )}
      </div>

      {trades.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="h-7 w-7 animate-pulse rounded-full bg-white/10" />
          <p className="text-sm text-[var(--text-muted)]">Waiting for first trade…</p>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {trades.map((trade, i) => {
          const t = trade as any;
          return (
            <div key={`${trade.id}-${i}`}
              className={`flex-shrink-0 w-[200px] rounded-[1.2rem] border bg-white/5 p-3 ${
                t.txHash ? 'border-[var(--teal)]/20' : 'border-white/10'
              }`}>
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate text-[11px] font-bold text-white">
                    {t.agentName || t.agentId?.slice(0, 8)}
                  </span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    trade.type === "BUY"  ? "bg-[var(--green-soft)] text-[var(--green)]" :
                    trade.type === "SELL" ? "bg-[var(--red-soft)] text-[var(--red)]" :
                    "bg-white/10 text-[var(--text-secondary)]"
                  }`}>{trade.type}</span>
                </div>
                <span className="shrink-0 font-mono text-[9px] text-[var(--text-muted)]">{timeAgo(t.timestamp)}</span>
              </div>
              <div className="font-mono text-sm text-white mb-1">{trade.amount} · {trade.pair}</div>
              <div className="font-mono text-xs mb-2" style={{
                color: (trade.priceImpact || '').startsWith('+') ? 'var(--green)' : 'var(--red)'
              }}>{trade.priceImpact}</div>
              <p className="text-[10px] leading-4 text-[var(--text-secondary)] line-clamp-2 mb-2">{trade.rationale}</p>
              <TxLink txHash={t.txHash} txExplorerUrl={t.txExplorerUrl} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
