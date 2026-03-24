"use client";

import { useState, useEffect } from "react";

interface TickerItem {
  instId: string;
  last: string;
  sodUtc0: string; // 24h open price
  change24h?: number;
}

const PAIRS = ["BTC-USDT", "ETH-USDT", "OKB-USDT", "SOL-USDT"];

const LABELS: Record<string, string> = {
  "BTC-USDT": "BTC",
  "ETH-USDT": "ETH",
  "OKB-USDT": "OKB",
  "SOL-USDT": "SOL",
};

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

export function PriceTicker() {
  const [prices, setPrices] = useState<Record<string, TickerItem>>({});
  const [loading, setLoading] = useState(true);

  const fetchPrices = async () => {
    try {
      const res = await fetch(
        "https://www.okx.com/api/v5/market/tickers?instType=SPOT",
        { next: { revalidate: 0 } }
      );
      const json = await res.json();
      if (json.data) {
        const map: Record<string, TickerItem> = {};
        for (const item of json.data) {
          if (PAIRS.includes(item.instId)) {
            const last = parseFloat(item.last);
            const open = parseFloat(item.sodUtc0);
            map[item.instId] = {
              ...item,
              change24h: open > 0 ? ((last - open) / open) * 100 : 0,
            };
          }
        }
        setPrices(map);
        setLoading(false);
      }
    } catch {
      // silently fail — don't break the page
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-10 items-center gap-6 overflow-hidden rounded-[1rem] border border-white/10 bg-black/40 px-4 animate-pulse">
        {PAIRS.map((p) => (
          <div key={p} className="h-3 w-24 rounded bg-white/10 flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1rem] border border-white/10 bg-black/60 backdrop-blur-sm">
      <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
        {PAIRS.map((pair) => {
          const item = prices[pair];
          if (!item) return null;
          const price = parseFloat(item.last);
          const chg = item.change24h ?? 0;
          const isUp = chg >= 0;

          return (
            <div
              key={pair}
              className="flex flex-shrink-0 items-center gap-2 border-r border-white/10 px-4 py-2.5 last:border-r-0"
            >
              <span className="font-mono text-xs font-bold text-white">
                {LABELS[pair]}
              </span>
              <span className="font-mono text-xs text-[var(--text-secondary)]">
                ${formatPrice(price)}
              </span>
              <span
                className="font-mono text-[10px] font-semibold"
                style={{ color: isUp ? "#22c55e" : "#ef4444" }}
              >
                {isUp ? "+" : ""}{chg.toFixed(2)}%
              </span>
            </div>
          );
        })}

        {/* Live indicator */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-1.5 px-4 py-2.5">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Live</span>
        </div>
      </div>
    </div>
  );
}
