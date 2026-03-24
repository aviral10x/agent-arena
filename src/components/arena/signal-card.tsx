'use client';

import { useState } from 'react';
import { useX402Payment } from '@/hooks/use-x402';
import { useAccount } from 'wagmi';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then(m => ({ default: m.ConnectButton })),
  { ssr: false }
);

type SignalData = {
  id:           string;
  tradeType:    string;
  pair:         string;
  rationale:    string;
  priceUsd:     number;
  unlockCount:  number;
  createdAt:    string;
  priceAtSignal: number;
  agent:        { name: string; color: string; archetype: string };
  competition:  { id: string; title: string; status: string };
};

function timeAgo(ts: string) {
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export function SignalCard({ signal }: { signal: SignalData }) {
  const { isConnected } = useAccount();
  const [unlocked, setUnlocked] = useState(false);
  const [fullData, setFullData] = useState<{ rationale: string; priceAtSignal: number } | null>(null);
  const { pay, isPending, isError, errMsg } = useX402Payment('signal', signal.id);

  const handleUnlock = async () => {
    const ok = await pay(signal.priceUsd);
    if (ok) {
      const res = await fetch(`/api/signals/${signal.id}/unlock`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: {} }),
      });
      if (res.ok) {
        const data = await res.json();
        setFullData({ rationale: data.rationale, priceAtSignal: data.priceAtSignal });
        setUnlocked(true);
      }
    }
  };

  const typeColor = signal.tradeType === 'BUY' ? 'var(--green)' : 'var(--red)';
  const typeBg    = signal.tradeType === 'BUY' ? 'var(--green-soft)' : 'var(--red-soft)';

  return (
    <div className="glass-panel overflow-hidden rounded-[1.6rem] p-4 sm:p-5 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-full"
            style={{ background: `radial-gradient(circle at 35% 35%, ${signal.agent.color}cc, ${signal.agent.color}44)` }} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{signal.agent.name}</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{signal.agent.archetype}</div>
          </div>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.16em]"
          style={{ color: typeColor, background: typeBg }}>
          {signal.tradeType}
        </span>
      </div>

      {/* Pair + price */}
      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Pair</div>
            <div className="mt-0.5 font-mono text-sm text-white">{signal.pair}</div>
          </div>
          {signal.priceAtSignal > 0 && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Price</div>
              <div className="mt-0.5 font-mono text-xs text-white">${signal.priceAtSignal.toFixed(4)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Rationale */}
      <div className="relative rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 min-h-[60px]">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] mb-1">Rationale</div>
        {unlocked && fullData ? (
          <p className="text-xs leading-5 text-[var(--text-secondary)]">{fullData.rationale}</p>
        ) : (
          <div className="relative">
            <p className="text-xs leading-5 text-[var(--text-secondary)] blur-sm select-none line-clamp-2">
              {signal.rationale.slice(0, 80)}...
            </p>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-white/20 bg-slate-900/80 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                🔒 Unlock to read
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 pt-0.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
          <span>{timeAgo(signal.createdAt)}</span>
          <span>·</span>
          <span>{signal.unlockCount} unlock{signal.unlockCount !== 1 ? 's' : ''}</span>
          <span>·</span>
          <Link href={`/competitions/${signal.competition.id}`}
            className="hover:text-white transition truncate max-w-[120px]">
            {signal.competition.title}
          </Link>
        </div>
        <div className="shrink-0">
          {unlocked ? (
            <span className="rounded-full bg-[var(--green-soft)] px-3 py-1 text-xs font-semibold text-[var(--green)]">✓ Unlocked</span>
          ) : !isConnected ? (
            <ConnectButton />
          ) : (
            <button onClick={handleUnlock} disabled={isPending}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                isPending ? 'cursor-wait bg-white/10 text-[var(--text-muted)]'
                : 'bg-[var(--cyan-soft)] text-[var(--cyan)] hover:bg-[var(--cyan)] hover:text-slate-950'
              }`}>
              {isPending ? '…' : `Unlock · $${signal.priceUsd}`}
            </button>
          )}
        </div>
      </div>
      {isError && errMsg && <p className="text-xs text-[var(--red)]">{errMsg}</p>}
    </div>
  );
}
