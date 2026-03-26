"use client";
import dynamic from "next/dynamic";

export const SportAgentBuilderLazy = dynamic(
  () => import("@/components/arena/sport-agent-builder").then(m => ({ default: m.SportAgentBuilder })),
  {
    ssr: false,
    loading: () => (
      <div className="glass-panel rounded-[1.6rem] p-8 h-48 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    ),
  }
);
