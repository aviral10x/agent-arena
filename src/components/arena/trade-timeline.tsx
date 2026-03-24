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
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">{title}</div>

      {trades.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 pb-4 text-center">
          <div className="h-7 w-7 animate-pulse rounded-full bg-white/10" />
          <p className="text-sm text-[var(--text-muted)]">Waiting for first trade…</p>
        </div>
      )}

      <div className="mt-4 space-y-2 sm:space-y-3">
        {trades.map((trade, i) => (
          <div key={`${trade.id}-${i}`} className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/5 p-3 sm:p-4">

            {/* Header: agent name + type badge + timestamp */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white truncate max-w-[150px] sm:max-w-none">
                {(trade as any).agentName || trade.agentId}
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.16em] ${
                trade.type === "BUY"  ? "bg-[var(--green-soft)] text-[var(--green)]"  :
                trade.type === "SELL" ? "bg-[var(--red-soft)]   text-[var(--red)]"    :
                "bg-white/10 text-[var(--text-secondary)]"
              }`}>
                {trade.type}
              </span>
              <span className="ml-auto shrink-0 font-mono text-xs text-[var(--text-muted)]">
                {timeAgo((trade as any).timestamp)}
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
          </div>
        ))}
      </div>
    </div>
  );
}
