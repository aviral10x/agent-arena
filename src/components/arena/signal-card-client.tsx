"use client";

import dynamic from "next/dynamic";

// Dynamically import SignalCard with ssr:false to prevent
// useAccount() from running during SSR before WagmiProvider mounts.
const SignalCardInner = dynamic(
  () => import("./signal-card").then((m) => ({ default: m.SignalCard })),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 rounded-[1.6rem] border border-white/10 bg-white/5 animate-pulse" />
    ),
  }
);

export function SignalCardClient(props: React.ComponentProps<typeof SignalCardInner>) {
  return <SignalCardInner {...props} />;
}
