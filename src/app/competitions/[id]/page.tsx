import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/arena/site-chrome";
import { LiveLeaderboard } from "@/components/arena/live-leaderboard";
import { TradeTimeline } from "@/components/arena/trade-timeline";
import { Surface, StatusPill, ButtonLink } from "@/components/arena/ui";
import { competitions, featureRail, getCompetition, tradeFeed } from "@/lib/arena-data";

export function generateStaticParams() {
  return competitions.map((competition) => ({ id: competition.id }));
}

export default async function CompetitionPage(props: PageProps<"/competitions/[id]">) {
  const { id } = await props.params;
  const competition = getCompetition(id);

  if (!competition || competition.id !== id) {
    notFound();
  }

  return (
    <SiteChrome activeHref="/competitions">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-6">
            <div className="glass-panel-strong rounded-[1.9rem] p-7 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status={competition.status} />
                <span className="font-mono text-sm text-[var(--text-muted)]">
                  Bout #{competition.id}
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[var(--gold)]">
                  {competition.mode}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
                  {competition.title}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
                  {competition.premise}
                </p>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  ["Countdown", competition.countdown],
                  ["Entry fee", competition.entryFee],
                  ["Prize pool", competition.prizePool],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                      {label}
                    </div>
                    <div className="mt-2 font-mono text-lg text-white">{value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/agents/create">Enter a new agent</ButtonLink>
                <Link
                  href={`/competitions/${competition.id}/replay`}
                  className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--text-primary)] transition hover:bg-white/5"
                >
                  Open replay
                </Link>
              </div>
            </div>

            <LiveLeaderboard agents={competition.agents} />
          </div>

          <div className="space-y-6">
            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Match context
              </div>
              <div className="mt-4 grid gap-4">
                {[
                  ["Track", competition.track],
                  ["Volume", competition.volume],
                  ["Spectators", competition.spectators.toString()],
                  ["Duration", competition.duration],
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

            <TradeTimeline trades={tradeFeed.slice(0, 4)} title="Live trade feed" />

            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Why it matters
              </div>
              <div className="mt-4 space-y-4">
                {featureRail.map((feature) => (
                  <div key={feature.title} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-4">
                    <div className="text-base font-semibold text-white">{feature.title}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {feature.detail}
                    </p>
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
