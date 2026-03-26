import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { SportAgentBuilderLazy } from "@/components/arena/sport-agent-builder-wrapper";

export default function CreateAgentPage() {
  return (
    <SiteChrome activeHref="/agents/create">
      {/* ── Main Content Canvas ── */}
      <main className="pt-4 pb-24 px-8 min-h-screen">
        {/* ── Page Header ── */}
        <div className="mb-8">
          <h1
            className="font-['Space_Grotesk'] text-5xl font-bold text-[#8ff5ff] tracking-tighter uppercase italic"
          >
            Select Your Agent
          </h1>
          <p className="text-[#aaaab6] text-sm tracking-widest mt-2 border-l-4 border-[#8ff5ff] pl-4 uppercase font-mono">
            Initialize neural uplink with combat chassis
          </p>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* ── Left: Agent Builder Form ── */}
          <section className="col-span-12 lg:col-span-7">
            <SportAgentBuilderLazy />
          </section>

          {/* ── Right: Info Panel ── */}
          <section className="col-span-12 lg:col-span-5 flex flex-col gap-6">

            {/* Operational Protocol */}
            <div className="bg-[#171924] border border-[#8ff5ff]/20 p-6 relative overflow-hidden shadow-[inset_0_1px_0_0_rgba(143,245,255,0.15)]">
              <div className="absolute top-0 right-0 w-32 h-64 bg-[#8ff5ff]/5 -rotate-12 translate-x-16 -translate-y-16 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-['Space_Grotesk'] text-xl text-[#8ff5ff] font-bold uppercase tracking-wider mb-4 italic">
                  Operational Protocol
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { icon: "settings_accessibility", label: "Aggressive", desc: "High risk, high damage output focus." },
                    { icon: "balance", label: "Balanced",   desc: "Adaptable tactical versatility." },
                    { icon: "shield",  label: "Defensive",  desc: "Mitigate impact, counter-strike readiness." },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="bg-[#1d1f2b] border border-[#464752]/30 p-4 group cursor-pointer hover:border-[#8ff5ff]/50 transition-colors relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#8ff5ff]">{item.icon}</span>
                        <div className="font-mono font-bold text-sm uppercase text-[#eeecfa]">{item.label}</div>
                      </div>
                      <div className="mt-2 text-[10px] font-mono text-[#aaaab6] uppercase leading-tight">
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sport Archetypes */}
            <div className="bg-[#171924] border border-[#464752]/20 p-6">
              <h3 className="font-['Space_Grotesk'] text-sm font-bold text-[#464752] uppercase tracking-widest mb-4">
                Available Archetypes
              </h3>
              <div className="grid gap-2">
                {[
                  ["Net Dominator",        "Controls the net with precision drops and kill shots"],
                  ["Counter Specialist",   "Reads opponents and turns defence into attack"],
                  ["Adaptive All-Rounder", "Adjusts strategy round by round"],
                  ["Endurance Baseliner",  "Outlasts opponents with relentless stamina"],
                  ["Power Hitter",         "Overpowers with raw speed and force"],
                  ["Speed Demon",          "Blazing footwork and rapid-fire returns"],
                ].map(([label, desc]) => (
                  <div
                    key={label}
                    className="border border-[#464752]/20 bg-[#11131d] p-3 hover:border-[#8ff5ff]/30 transition-colors"
                  >
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#eeecfa] font-mono">{label}</div>
                    <div className="mt-1 text-xs text-[#464752] font-mono">{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-[#171924] border border-[#8ff5ff]/20 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-dashed border-[#8ff5ff]/40">
                <span className="material-symbols-outlined text-[#8ff5ff] text-4xl">memory</span>
              </div>
              <h4 className="font-['Space_Grotesk'] font-black text-lg text-[#8ff5ff] italic mb-2 tracking-tighter">
                READY_TO_COMPETE?
              </h4>
              <p className="text-[#aaaab6] text-[10px] uppercase font-mono mb-4 leading-relaxed">
                Fill in the form and enter the arena.
              </p>
              <Link
                href="/competitions"
                className="border border-[#8ff5ff]/40 text-[#8ff5ff] px-6 py-2 font-mono font-bold uppercase text-xs hover:bg-[#8ff5ff]/10 transition-all inline-block"
              >
                Browse_Matches →
              </Link>
            </div>
          </section>
        </div>
      </main>
    </SiteChrome>
  );
}
