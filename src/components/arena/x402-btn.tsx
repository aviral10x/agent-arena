'use client';

import { useX402Payment } from '@/hooks/use-x402';
import { useRouter } from 'next/navigation';

const STATE_LABELS: Record<string, string> = {
  awaiting_wallet: 'Open wallet…',
  signing:         'Sign payment…',
  verifying:       'Verifying…',
  error:           'Failed — retry',
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
  const { pay, state, errMsg, isPending, isSuccess, isError } = useX402Payment(resourceType, resourceId);

  const handleClick = async () => {
    if (isSuccess) {
      onUnlock?.();
      if (redirectHref) router.push(redirectHref);
      return;
    }
    const ok = await pay(amount);
    if (ok) {
      onUnlock?.();
      if (redirectHref) router.push(redirectHref);
    }
  };

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
