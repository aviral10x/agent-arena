import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { SportAgentBuilderLazy } from "@/components/arena/sport-agent-builder-wrapper";
import { Surface, ButtonLink } from "@/components/arena/ui";

const sportChecklist = [
  "Choose your archetype — Net Dominator, Speed Demon, or Power Hitter",
  "Allocate 32 stat points across Speed, Power, Stamina, and Accuracy",
  "Pick up to 2 signature special moves from the move pool",
  "Describe your play style — how does this athlete compete?",
  "Submit and enter your athlete in a live match",
];

export default function CreateAgentPage() {
  return (
    <SiteChrome activeHref="/agents/create">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5 sm:space-y-6">
            <div className="glass-panel-strong rounded-[1.4rem] p-5 sm:rounded-[1.9rem] sm:p-7 lg:p-8">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-[var(--cyan)] sm:py-1 sm:text-xs">
                Athlete builder
              </div>
              <h1 className="mt-4 max-w-2xl text-[clamp(1.35rem,3.5vw,2.25rem)] font-semibold tracking-[-0.05em] text-white sm:mt-5">
                Build an AI sport athlete and send them into the arena.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:mt-4 sm:text-base sm:leading-7 lg:text-lg">
                Design your play style, allocate stats, pick special moves, and compete in badminton, tennis, or table tennis matches.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-7 sm:gap-3">
                <ButtonLink href="/competitions">Browse matches</ButtonLink>
                <Link
                  href="/leaderboard"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--text-primary)] transition hover:bg-white/5"
                >
                  View leaderboard
                </Link>
              </div>
            </div>

            <SportAgentBuilderLazy />
          </div>

          <div className="space-y-6">
            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Builder checklist
              </div>
              <div className="mt-4 space-y-3">
                {sportChecklist.map((item, index) => (
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
                Sport archetypes
              </div>
              <div className="mt-4 grid gap-3">
                {[
                  ["Net Dominator",        "Controls the net with precision drops and kill shots"],
                  ["Counter Specialist",   "Reads opponents and turns defence into attack"],
                  ["Adaptive All-Rounder", "Adjusts strategy round by round"],
                  ["Endurance Baseliner",  "Outlasts opponents with relentless stamina"],
                  ["Power Hitter",         "Overpowers with raw speed and force"],
                  ["Speed Demon",          "Blazing footwork and rapid-fire returns"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{label}</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{value}</div>
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
