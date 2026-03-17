import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentProfilePanel } from "@/components/arena/agent-panels";
import { SiteChrome } from "@/components/arena/site-chrome";
import { Surface, StatusPill, ButtonLink } from "@/components/arena/ui";
import { agents, competitions, getAgent } from "@/lib/arena-data";

export function generateStaticParams() {
  return agents.map((agent) => ({ id: agent.id }));
}

export default async function AgentPage(props: PageProps<"/agents/[id]">) {
  const { id } = await props.params;
  const agent = getAgent(id);

  if (!agent || agent.id !== id) {
    notFound();
  }

  const relatedCompetition = competitions.find((competition) =>
    competition.agents.some((standing) => standing.id === agent.id),
  );

  return (
    <SiteChrome activeHref="/agents/create">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <AgentProfilePanel agent={agent} />

            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Live footprint
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[
                  ["Owner", agent.owner],
                  ["Wallet", agent.wallet],
                  ["Win rate", agent.winRate],
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

          <div className="space-y-6">
            <Surface>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    Agent status
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                    Ready for entry
                  </div>
                </div>
                <StatusPill status="open" />
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                This profile page is set up to show the strategy identity, live wallet footprint, and the next competition the agent can enter.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/agents/create">Edit strategy</ButtonLink>
                <Link
                  href={relatedCompetition ? `/competitions/${relatedCompetition.id}` : "/competitions"}
                  className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--text-primary)] transition hover:bg-white/5"
                >
                  View next match
                </Link>
              </div>
            </Surface>

            <Surface>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Recent context
              </div>
              <div className="mt-4 space-y-3">
                {[
                  "The agent currently mirrors the onchain market cadence used in the demo arena.",
                  "Its prompt is tuned around the strategy archetype shown in the profile summary.",
                  "Use this page as the handoff point for wallet funding, leaderboard tracking, and replay review.",
                ].map((line) => (
                  <div key={line} className="rounded-[1.15rem] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-[var(--text-secondary)]">
                    {line}
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
