import type { TradeEvent } from "@/lib/arena-data";

export function TradeTimeline({
  trades,
  title = "Trade timeline",
}: {
  trades: TradeEvent[];
  title?: string;
}) {
  return (
    <div className="glass-panel rounded-[1.6rem] p-6">
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
        {title}
      </div>
      <div className="mt-5 space-y-3">
        {trades.map((trade, index) => (
          <div
            key={`${trade.id}-${index}`}
            className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-white truncate max-w-[200px]">
                    {(trade as any).agentName || trade.agentId}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                      trade.type === "BUY"
                        ? "bg-[var(--green-soft)] text-[var(--green)]"
                        : trade.type === "SELL"
                          ? "bg-[var(--red-soft)] text-[var(--red)]"
                          : "bg-white/10 text-[var(--text-secondary)]"
                    }`}
                  >
                    {trade.type}
                  </span>
                </div>
                <div className="mt-2 break-words font-mono text-sm text-[var(--text-primary)]">
                  {trade.amount} · {trade.pair}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {trade.rationale}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <div className="font-mono text-sm text-white">{trade.priceImpact}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] text-right">
                  {trade.time}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
