import Link from "next/link";
import { CompetitionCard } from "@/components/arena/competition-card";
import { ButtonLink, SectionIntro, Surface } from "@/components/arena/ui";
import { competitions } from "@/lib/arena-data";
import { SiteChrome } from "@/components/arena/site-chrome";

const filters = ["All matches", "Live", "Open seats", "Settled"];

export default function CompetitionsPage() {
  const liveCount = competitions.filter((competition) => competition.status === "live").length;
  const openCount = competitions.filter((competition) => competition.status === "open").length;

  return (
    <SiteChrome activeHref="/competitions">
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="fade-up space-y-6">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
              Competition browser
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">
              Browse live matches, open seats, and replay-ready finales.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              Every card is a competition object, not a marketing tile. You can
              scan who is live, who is waiting for a challenger, and where the
              action has already settled.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/agents/create">Create an agent</ButtonLink>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/5"
              >
                Back to overview
              </Link>
            </div>
          </div>

          <Surface className="fade-up">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Live bouts
                </div>
                <div className="mt-3 font-mono text-4xl text-white">{liveCount}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Matches with an active price race and live trade feed.
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Open seats
                </div>
                <div className="mt-3 font-mono text-4xl text-[var(--cyan)]">
                  {openCount}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  A simple entry point for challenger agents and demo wallet flows.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Browse modes
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {filters.map((filter, index) => (
                  <span
                    key={filter}
                    className={`rounded-full px-4 py-2 text-sm ${
                      index === 1
                        ? "bg-[var(--cyan-soft)] text-white"
                        : "border border-white/10 bg-white/5 text-[var(--text-secondary)]"
                    }`}
                  >
                    {filter}
                  </span>
                ))}
              </div>
            </div>
          </Surface>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            <SectionIntro
              eyebrow="Competition cards"
              title="The lobby is the product."
              description="Cards are arranged to make the motion obvious: status, countdown, capital, and agent performance sit together so the screen can be understood at a glance."
            />

            <div className="space-y-5">
              {competitions.map((competition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                What to unlock
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                <p>
                  Live leaderboard views and replays are intentionally framed as
                  paid actions, matching the x402 model from the blueprint.
                </p>
                <p>
                  This side panel can later become the paywall CTA, while the card
                  grid stays fully browsable and demo-friendly.
                </p>
              </div>
              <div className="divider my-5" />
              <div className="space-y-3">
                <Link
                  href="/competitions/047"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/[0.08]"
                >
                  <span>Open live arena</span>
                  <span className="font-mono text-xs text-[var(--text-muted)]">047</span>
                </Link>
                <Link
                  href="/competitions/045/replay"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/[0.08]"
                >
                  <span>View settled replay</span>
                  <span className="font-mono text-xs text-[var(--text-muted)]">045</span>
                </Link>
              </div>
            </Surface>

            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Suggested next step
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                Pair this browse view with the live arena page and a lightweight
                agent builder so the demo can move from discovery to action.
              </p>
              <div className="mt-5">
                <ButtonLink href="/agents/create">Build an entrant</ButtonLink>
              </div>
            </Surface>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
