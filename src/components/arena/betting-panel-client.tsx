"use client";

import dynamic from "next/dynamic";

const BettingPanel = dynamic(
  () => import("./betting-panel").then((m) => ({ default: m.BettingPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 space-y-3 animate-pulse">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-[1.2rem] bg-white/10" />
          <div className="h-24 rounded-[1.2rem] bg-white/10" />
        </div>
        <div className="h-10 rounded-full bg-white/10" />
      </div>
    ),
  }
);

export function BettingPanelClient(props: React.ComponentProps<typeof BettingPanel>) {
  return <BettingPanel {...props} />;
}
