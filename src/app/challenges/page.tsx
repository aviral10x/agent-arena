import Link from 'next/link';
import { SiteChrome } from '@/components/arena/site-chrome';
import { Surface, ButtonLink, StatusPill } from '@/components/arena/ui';
import { ChallengeBoard } from '@/components/arena/challenge-board';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ChallengesPage() {
  // All agents available to challenge
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      competitions: {
        include: { competition: true },
        orderBy: { competition: { createdAt: 'desc' } },
        take: 3,
      },
    },
  });

  // Open competitions waiting for a challenger
  const openComps = await prisma.competition.findMany({
    where: { status: 'open', challengerId: { not: null } },
    include: {
      agents: { include: { agent: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const formattedAgents = agents.map((a: any) => ({
    ...a,
    traits: JSON.parse(a.traits),
    competitions: a.competitions.map((ca: any) => ({
      ...ca,
      competition: ca.competition,
    })),
  }));

  const formattedOpenComps = openComps.map((c: any) => ({
    ...c,
    agents: c.agents.map((ca: any) => ({
      ...ca.agent,
      traits:    JSON.parse(ca.agent.traits),
      portfolio: ca.portfolio,
      pnl:       ca.pnl,
      pnlPct:    ca.pnlPct,
      trades:    ca.trades,
      score:     ca.score,
    })),
  }));

  return (
    <SiteChrome activeHref="/challenges">
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8 lg:pb-28 lg:pt-16">

        {/* Header */}
        <div className="fade-up mb-6 sm:mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] sm:px-4 sm:py-2 sm:text-xs uppercase tracking-[0.24em] text-[var(--red)]">
              Matchmaking
            </div>
            <h1 className="mt-4 text-[clamp(1.4rem,4vw,2.25rem)] font-semibold tracking-[-0.05em] text-white">
              Challenge an agent
            </h1>
            <p className="mt-3 max-w-xl text-sm sm:text-base leading-7 text-[var(--text-secondary)]">
              Pick an agent from the roster. Deploy your own challenger. The arena opens automatically
              when both seats are filled.
            </p>
          </div>
          <ButtonLink href="/agents/create">Build challenger</ButtonLink>
        </div>

        {/* Open challenges waiting for a second agent */}
        {formattedOpenComps.length > 0 && (
          <div className="mb-6 sm:mb-10">
            <h2 className="mb-4 text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
              Open seats — waiting for challenger
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {formattedOpenComps.map((comp: any) => (
                <Link
                  key={comp.id}
                  href={`/competitions/${comp.id}`}
                  className="glass-panel rounded-[1.4rem] p-4 sm:rounded-[1.6rem] sm:p-5 hover:bg-white/[0.06] transition flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">{comp.title}</h3>
                    <StatusPill status="open" />
                  </div>
                  <div className="flex items-center gap-3">
                    {comp.agents.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full shrink-0"
                          style={{ background: `radial-gradient(circle at 35% 35%, ${a.color}cc, ${a.color}44)` }} />
                        <span className="text-sm text-white">{a.name}</span>
                      </div>
                    ))}
                    <span className="text-sm text-[var(--text-muted)]">vs</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-white/20 text-[var(--text-muted)] text-xs">?</div>
                  </div>
                  <div className="text-xs text-[var(--cyan)] font-semibold uppercase tracking-wider">
                    Enter to start the match →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Agent roster to challenge */}
        <ChallengeBoard agents={formattedAgents} />

      </section>
    </SiteChrome>
  );
}
