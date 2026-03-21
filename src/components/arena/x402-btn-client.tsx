"use client";

import dynamic from "next/dynamic";

const X402Button = dynamic(
  () => import("./x402-btn").then((m) => m.X402Button),
  { ssr: false, loading: () => <div className="h-10 w-40 rounded-full bg-white/10 animate-pulse" /> }
);

export function X402ButtonClient(props: {
  label: string;
  amount?: number;
  onUnlock?: () => void;
  redirectHref?: string;
}) {
  return <X402Button {...props} />;
}
