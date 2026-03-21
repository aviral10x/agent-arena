"use client";

import dynamic from "next/dynamic";
import type { Competition } from "@/lib/arena-data";

const CompetitionCard = dynamic(
  () => import("./competition-card").then((m) => m.CompetitionCard),
  { ssr: false, loading: () => <div className="h-32 rounded-2xl border border-white/10 bg-white/5 animate-pulse" /> }
);

export function CompetitionCardClient({ competition }: { competition: Competition }) {
  return <CompetitionCard competition={competition} />;
}
