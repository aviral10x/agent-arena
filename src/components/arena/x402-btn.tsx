"use client";

import { useX402Payment } from "@/hooks/use-x402";
import { useRouter } from "next/navigation";
import { cx } from "./ui";

export function X402Button({
  label,
  amount = 1,
  onUnlock,
  redirectHref,
}: {
  label: string;
  amount?: number;
  onUnlock?: () => void;
  redirectHref?: string;
}) {
  const router = useRouter();
  const { pay, isPending, isSuccess } = useX402Payment();

  const handlePay = async () => {
    if (isSuccess) {
      if (onUnlock) onUnlock();
      if (redirectHref) router.push(redirectHref);
      return;
    }

    await pay(amount);
    // Note: Reacting to success is typically handled by the hook state changing,
    // but we can also trigger redirects if we confirm success later.
    // For now, if they click while mining/paying, it shows the spinner.
    // Once unlocked, the state changes to Unlocked.
  };

  if (isSuccess) {
    return (
      <button
        onClick={() => {
          if (onUnlock) onUnlock();
          if (redirectHref) router.push(redirectHref);
        }}
        className="rounded-full bg-[var(--green-soft)] px-4 py-2 text-sm font-medium text-[var(--green)] transition"
      >
        Access Granted
      </button>
    );
  }

  return (
    <button
      onClick={handlePay}
      disabled={isPending}
      className={cx(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition",
        isPending
          ? "cursor-wait bg-white/10 text-[var(--text-muted)]"
          : "bg-[var(--cyan-soft)] text-[var(--cyan)] hover:bg-[var(--cyan)] hover:text-slate-950"
      )}
    >
      {isPending ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          x402 Transaction...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          {label} (${amount})
        </span>
      )}
    </button>
  );
}
