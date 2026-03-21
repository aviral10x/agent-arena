"use client";

import { useLiveCompetition } from "@/hooks/use-live-competition";
import { LiveLeaderboard } from "./live-leaderboard";
import { TradeTimeline } from "./trade-timeline";
import { LiveMatchRunner } from "./live-match-runner";
import type { Competition, TradeEvent } from "@/lib/arena-data";

export function LiveMatchWrapper({
  initialCompetition,
  initialTrades,
}: {
  initialCompetition: Competition;
  initialTrades: TradeEvent[];
}) {
  const { competition, trades } = useLiveCompetition(initialCompetition, initialTrades);

  return (
    <>
      <LiveMatchRunner competitionId={competition.id} isLive={competition.status === "live"} />
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <LiveLeaderboard agents={competition.agents} />
        <TradeTimeline trades={trades} />
      </div>
    </>
  );
}
