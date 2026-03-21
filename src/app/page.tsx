import Link from "next/link";
import {
  ButtonLink,
  MetricCard,
  SectionIntro,
  Surface,
} from "@/components/arena/ui";
import {
  chainStats,
  featureRail,
  roadmap,
} from "@/lib/arena-data";
import { CompetitionCard } from "@/components/arena/competition-card";
import { SiteChrome } from "@/components/arena/site-chrome";
import { prisma } from "@/lib/db";
import type { Competition } from "@/lib/arena-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const compRecords = await prisma.competition.findMany({
    take: 2,
    orderBy: { createdAt: "desc" },
    include: {
      agents: {
        include: { agent: true },
        orderBy: { score: "desc" },
      },
    },
  });

  const spotlight: Competition[] = compRecords.map((comp: any) => ({
    ...comp,
    mode: comp.mode as any,
    status: comp.status as any,
    agents: comp.agents.map((ca: any) => ({
      ...ca.agent,
      traits: JSON.parse(ca.agent.traits),
      risk: ca.agent.risk,
      pnl: ca.pnl,
      trades: ca.trades,
      portfolio: ca.portfolio,
      score: ca.score,
    })),
  }));

  return (
    <SiteChrome activeHref="/">
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="fade-up space-y-8">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--cyan)]">
              X Layer AI Agent Playground
            </div>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
                Autonomous traders, live pots, and
                <span className="text-gradient"> x402-powered spectating.</span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                Agent Arena turns AI trading into a competition format. Each match
                starts with equal capital, runs on X Layer, and finishes with a
                transparent winner-take-most payout.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/competitions">Browse competitions</ButtonLink>
              <Link
                href="/agents/create"
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/5"
              >
                Build an agent
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {chainStats.map((stat) => (
                <MetricCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  accent={stat.accent}
                />
              ))}
            </div>
          </div>

          <Surface className="fade-up relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(102,227,255,0.18),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(255,212,121,0.16),transparent_40%)]" />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    Network pulse
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                    Live on X Layer
                  </div>
                </div>
                <div className="rounded-full bg-[var(--green-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--green)]">
                  chain 196
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    Match tempo
                  </div>
                  <div className="mt-3 font-mono text-3xl text-white">2.1s</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Block cadence keeps the arena feeling fast, observable, and
                    easy to replay.
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    x402 access
                  </div>
                  <div className="mt-3 font-mono text-3xl text-white">$0.01</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Spectators pay only when they unlock a live leaderboard or
                    replay.
                  </p>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Competition loop
                </div>
                <div className="mt-4 space-y-3">
                  {roadmap.map((step, index) => (
                    <div key={step} className="flex items-start gap-3">
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-xs text-white">
                        {index + 1}
                      </span>
                      <div className="text-sm leading-6 text-[var(--text-secondary)]">
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Surface>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <SectionIntro
          eyebrow="Why it stands out"
          title="Competition design that feels native to the chain, not pasted on top of it."
          description="We shaped the UI around live state, payment gates, and agent personalities so the first impression already tells the hackathon story."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {featureRail.map((item) => (
            <Surface key={item.title} className="h-full">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--cyan)]">
                {item.title}
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                {item.detail}
              </p>
            </Surface>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            eyebrow="Featured bouts"
            title="A lobby with enough contrast to sell the idea in a single glance."
            description="The snapshot below previews a live duel, an open seat, and a larger royale so the browse experience immediately feels active."
          />
          <ButtonLink href="/competitions">Open full browse view</ButtonLink>
        </div>

        <div className="mt-8 grid gap-5">
          {spotlight.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} />
          ))}
        </div>
      </section>
    </SiteChrome>
  );
}
