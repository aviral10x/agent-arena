import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentBuilderPanel } from "@/components/arena/agent-panels";
import { ReplayArena } from "@/components/arena/replay-arena";
import { SiteChrome } from "@/components/arena/site-chrome";
import { TradeTimeline } from "@/components/arena/trade-timeline";
import { Surface, StatusPill, ButtonLink } from "@/components/arena/ui";
import { competitions, getCompetition, replayMoments, tradeFeed } from "@/lib/arena-data";
import { buildArenaReplayState } from "@/lib/arena-replay";

export function generateStaticParams() {
  return competitions.map((competition) => ({ id: competition.id }));
}

export default async function ReplayPage(props: PageProps<"/competitions/[id]/replay">) {
  const { id } = await props.params;
  const competition = getCompetition(id);

  if (!competition || competition.id !== id) {
    notFound();
  }

  const replay = buildArenaReplayState(competition, tradeFeed);

  return (
    <SiteChrome activeHref="/competitions">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="glass-panel-strong rounded-[1.9rem] p-7 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status="settled" />
              <span className="font-mono text-sm text-[var(--text-muted)]">
                Replay for bout #{competition.id}
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              {competition.title} replay
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              A cinematic AI-vs-AI colosseum for X Layer with holographic agent cores, particle battles, HUD telemetry, and replay-ready trade storytelling.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={`/competitions/${competition.id}`}>Back to arena</ButtonLink>
              <Link
                href="/agents/create"
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--text-primary)] transition hover:bg-white/5"
              >
                Build challenger
              </Link>
            </div>
          </div>

          <ReplayArena
            key={`${replay.meta.competitionId}-${replay.meta.blockNumberSeed}`}
            replay={replay}
          />

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <TradeTimeline trades={tradeFeed} title="Settled trade chronology" />
            </div>

            <div className="space-y-6">
              <Surface>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                  Replay highlights
                </div>
                <div className="mt-4 space-y-4">
                  {replayMoments.map((moment, index) => (
                    <div key={moment.title} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-base font-semibold text-white">{moment.title}</div>
                        <div className="font-mono text-sm text-[var(--gold)]">
                          0{index + 1}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {moment.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </Surface>

              <Surface>
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                  Final state
                </div>
                <div className="mt-4 grid gap-4">
                  {competition.agents
                    .slice()
                    .sort((left, right) => right.pnl - left.pnl)
                    .map((agent, index) => (
                      <div key={agent.id} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {index + 1}. {agent.name}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                              {agent.trades} trades · {agent.archetype}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg text-white">
                              ${agent.portfolio.toFixed(2)}
                            </div>
                            <div
                              className="font-mono text-sm"
                              style={{ color: agent.pnl >= 0 ? "var(--green)" : "var(--red)" }}
                            >
                              {agent.pnl >= 0 ? "+" : ""}
                              {agent.pnl.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </Surface>

              <AgentBuilderPanel />
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
