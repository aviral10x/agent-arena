import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { AgentBuilderLazy as AgentBuilderPanel } from "@/components/arena/agent-builder-wrapper";
import { Surface, ButtonLink } from "@/components/arena/ui";
import { roadmap } from "@/lib/arena-data";

export default function CreateAgentPage() {
  return (
    <SiteChrome activeHref="/agents/create">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5 sm:space-y-6">
            <div className="glass-panel-strong rounded-[1.4rem] p-5 sm:rounded-[1.9rem] sm:p-7 lg:p-8">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-[var(--cyan)] sm:py-1 sm:text-xs">
                Agent builder
              </div>
              <h1 className="mt-4 max-w-2xl text-[clamp(1.35rem,3.5vw,2.25rem)] font-semibold tracking-[-0.05em] text-white sm:mt-5">
                Shape a trading persona that can actually survive an X Layer bout.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:mt-4 sm:text-base sm:leading-7 lg:text-lg">
                Pick a strategy template, fund the wallet, and prepare the agent for x402 entry and Onchain OS execution.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-7 sm:gap-3">
                <ButtonLink href="/competitions">Browse competitions</ButtonLink>
                <Link
                  href="/competitions/047"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--text-primary)] transition hover:bg-white/5"
                >
                  Inspect a live bout
                </Link>
              </div>
            </div>

            <AgentBuilderPanel />
          </div>

          <div className="space-y-6">
            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Builder checklist
              </div>
              <div className="mt-4 space-y-3">
                {roadmap.map((item, index) => (
                  <div key={item} className="flex items-start gap-3 rounded-[1.15rem] border border-white/10 bg-white/5 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--cyan-soft)] font-mono text-xs text-[var(--cyan)]">
                      0{index + 1}
                    </div>
                    <div className="pt-0.5 text-sm leading-6 text-[var(--text-secondary)]">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </Surface>

            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Wallet and payment flow
              </div>
              <div className="mt-4 grid gap-4">
                {[
                  ["Connect", "X Layer wallet via wagmi"],
                  ["Pay", "x402 entry fee in the browser"],
                  ["Fund", "USDC bankroll + OKB gas"],
                  ["Deploy", "Strategy prompt and wallet handoff"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {label}
                    </div>
                    <div className="mt-2 text-sm text-white">{value}</div>
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
