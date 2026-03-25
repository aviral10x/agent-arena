import type { TradeEvent } from "@/lib/arena-data";

function timeAgo(ts: string | Date | undefined): string {
  if (!ts) return "just now";
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export function TradeTimeline({ trades, title = "Trade timeline" }: { trades: TradeEvent[]; title?: string }) {
  return (
    <div className="glass-panel overflow-hidden rounded-[1.6rem] p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">{title}</div>
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--teal)]/20 bg-[var(--teal)]/8 px-2 py-0.5">
          <div className="live-dot" style={{ width: 5, height: 5 }} />
          <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--teal)]">Onchain</span>
        </div>
      </div>

      {trades.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 pb-4 text-center">
          <div className="h-7 w-7 animate-pulse rounded-full bg-white/10" />
          <p className="text-sm text-[var(--text-muted)]">Waiting for first trade…</p>
        </div>
      )}

      <div className="mt-4 space-y-2 sm:space-y-3">
        {trades.map((trade, i) => {
          const t = trade as any;
          const hasTx = !!t.txHash;

          return (
            <div key={`${trade.id}-${i}`} className={`overflow-hidden rounded-[1.2rem] border bg-white/5 p-3 sm:p-4 transition-colors ${hasTx ? 'border-[var(--teal)]/20 hover:border-[var(--teal)]/40' : 'border-white/10'}`}>

              {/* Header: agent name + type badge + chain badge + timestamp */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white truncate max-w-[130px] sm:max-w-none">
                  {t.agentName || trade.agentId}
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] ${
                  trade.type === "BUY"  ? "bg-[var(--green-soft)] text-[var(--green)]"  :
                  trade.type === "SELL" ? "bg-[var(--red-soft)]   text-[var(--red)]"    :
                  "bg-white/10 text-[var(--text-secondary)]"
                }`}>
                  {trade.type}
                </span>

                {/* On-chain badge */}
                {hasTx && (
                  <span className="shrink-0 rounded-full bg-[var(--teal)]/10 border border-[var(--teal)]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[var(--teal)]">
                    ✓ onchain
                  </span>
                )}

                <span className="ml-auto shrink-0 font-mono text-xs text-[var(--text-muted)]">
                  {timeAgo(t.timestamp)}
                </span>
              </div>

              {/* Amount + pair */}
              <div className="mt-1.5 font-mono text-sm text-[var(--text-primary)]">
                {trade.amount} · {trade.pair}
              </div>

              {/* Rationale + price impact */}
              <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <p className="text-xs leading-5 text-[var(--text-secondary)] line-clamp-2 sm:line-clamp-none flex-1">
                  {trade.rationale}
                </p>
                <div className="shrink-0 font-mono text-sm text-white">{trade.priceImpact}</div>
              </div>

              {/* Tx hash row — visible for real onchain trades */}
              {hasTx && t.txExplorerUrl && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--teal)]/15 bg-[var(--teal)]/5 px-2.5 py-1.5">
                  <svg className="h-3 w-3 shrink-0 text-[var(--teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="font-mono text-[10px] text-[var(--teal)]/70 truncate flex-1">
                    {t.txHash.slice(0, 20)}…{t.txHash.slice(-8)}
                  </span>
                  <a
                    href={t.txExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[10px] font-semibold text-[var(--teal)] hover:underline flex items-center gap-1"
                    onClick={e => e.stopPropagation()}
                  >
                    View
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  {t.txChain && (
                    <span className="hidden shrink-0 text-[9px] text-[var(--text-muted)] sm:block">
                      {t.txChain}
                    </span>
                  )}
                </div>
              )}

              {/* Simulation label for non-onchain trades */}
              {!hasTx && (
                <div className="mt-1.5 text-[9px] uppercase tracking-widest text-[var(--text-muted)]/50">
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
