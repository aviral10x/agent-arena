"use client";
import dynamic from "next/dynamic";

// AgentBuilderPanel uses wagmi (useAccount) which requires WagmiProvider
// and cannot run on the server. This client wrapper loads it with ssr: false.
export const AgentBuilderLazy = dynamic(
  () => import("@/components/arena/agent-panels").then(m => ({ default: m.AgentBuilderPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="glass-panel rounded-[1.6rem] p-8 h-48 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    ),
  }
);
