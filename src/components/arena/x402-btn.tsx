'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { useRouter } from 'next/navigation';

type PayState = 'idle' | 'signing' | 'verifying' | 'success' | 'error';

const STATE_LABELS: Record<string, string> = {
  signing:   'Sign payment…',
  verifying: 'Verifying…',
  error:     'Failed — retry',
};

export function X402Button({
  label,
  amount = 1,
  resourceType = 'leaderboard',
  resourceId   = 'default',
  onUnlock,
  redirectHref,
}: {
  label:         string;
  amount?:       number;
  resourceType?: string;
  resourceId?:   string;
  onUnlock?:     () => void;
  redirectHref?: string;
}) {
  const router = useRouter();
  const { connected, connect, signX402Payment } = useWallet();
  const [state, setState] = useState<PayState>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const isPending = state === 'signing' || state === 'verifying';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  const handleClick = useCallback(async () => {
    if (isSuccess) {
      onUnlock?.();
      if (redirectHref) router.push(redirectHref);
      return;
    }

    if (!connected) {
      connect();
      return;
    }

    setState('signing');
    setErrMsg(null);

    try {
      const payload = await signX402Payment(amount);

      if (!payload) {
        setState('error');
        setErrMsg('Signing cancelled or failed.');
        return;
      }

      setState('verifying');

      const res = await fetch('/api/x402/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceType, resourceId, payload }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Payment verification failed');
      }

      setState('success');
      onUnlock?.();
      if (redirectHref) router.push(redirectHref);
    } catch (e: any) {
      setState('error');
      setErrMsg(e?.message ?? 'Payment failed');
    }
  }, [isSuccess, connected, connect, signX402Payment, amount, resourceType, resourceId, onUnlock, redirectHref, router]);

  if (isSuccess) {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--green-soft)] px-5 py-2.5 text-sm font-medium text-[var(--green)] transition hover:opacity-90"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Access granted
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition
          ${isError
            ? 'bg-[var(--red-soft)] text-[var(--red)]'
            : isPending
              ? 'cursor-wait bg-white/10 text-[var(--text-muted)]'
              : 'bg-[var(--cyan-soft)] text-[var(--cyan)] hover:bg-[var(--cyan)] hover:text-slate-950'
          }`}
      >
        {isPending ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            {STATE_LABELS[state] ?? 'Processing…'}
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {label} · ${amount}
          </>
        )}
      </button>
      {isError && errMsg && (
        <p className="text-xs text-[var(--red)]">{errMsg}</p>
      )}
    </div>
  );
}
