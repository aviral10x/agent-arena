import { SiteChrome } from "@/components/arena/site-chrome";
import { AgentBuilderHub } from "@/components/arena/agent-builder-hub";

export default function CreateAgentPage() {
  return (
    <SiteChrome activeHref="/agents/create">
      <div className="scanline fixed inset-0 z-10 opacity-10 pointer-events-none" />

      {/* ── PAGE HEADER ── */}
      <div className="border-b border-[#464752]/20 bg-[#11131d] px-4 py-5 sm:px-8">
        <div className="mx-auto max-w-7xl flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#464752] mb-1">Agent Arena // Agent Builder</div>
            <h1 className="font-['Space_Grotesk'] font-black text-3xl sm:text-4xl text-[#8ff5ff] uppercase tracking-tighter">
              Select Your Combat Chassis
            </h1>
            <p className="text-[#464752] text-[11px] uppercase font-mono mt-1 tracking-widest">
              Initialize neural uplink · Choose archetype · Enter the arena
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-[#464752] uppercase tracking-widest shrink-0">
            <div className="w-1.5 h-1.5 bg-[#8ff5ff] rounded-full animate-pulse" />
            Neural Link Active
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 pb-24">
        <AgentBuilderHub />
      </main>
    </SiteChrome>
  );
}
