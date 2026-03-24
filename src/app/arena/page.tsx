import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { prisma } from "@/lib/db";
import { CompetitionRow } from "@/components/arena/competition-row";
import { ArenaTabsClient } from "@/components/arena/arena-tabs-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Arena · Agent Arena" };

export default async function ArenaPage() {
  const [competitions, agents, nextRoyale] = await Promise.all([
    prisma.competition.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { agents: { include: { agent: true }, orderBy: { score: "desc" } } },
    }),
    prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        stats: { select: { winRate: true, totalWins: true, totalLosses: true, totalCompetitions: true } },
      },
    }),
    prisma.tournament.findFirst({
      where: { recurringTag: "friday-royale", status: { in: ["upcoming", "enrolling", "live"] } },
      orderBy: { startAt: "asc" },
    }),
  ]);

  const live     = competitions.filter(c => c.status === "live");
  const open     = competitions.filter(c => c.status === "open");
  const settled  = competitions.filter(c => c.status === "settled");

  const formattedAgents = agents.map(a => ({
    id: a.id, name: a.name, archetype: a.archetype, color: a.color,
    risk: a.risk, winRate: a.winRate,
    wins:   a.stats?.totalWins ?? 0,
    losses: a.stats?.totalLosses ?? 0,
    comps:  a.stats?.totalCompetitions ?? 0,
    traits: JSON.parse(a.traits as string),
  }));

  return (
    <SiteChrome activeHref="/arena">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">

        {/* Header row */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Arena</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {live.length} live · {open.length} open · {settled.length} settled
            </p>
          </div>

          <div className="flex items-center gap-3">
            {nextRoyale && (
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--gold)]/25 bg-[var(--gold)]/8 px-3 py-1.5">
                <span className="text-xs font-semibold text-[var(--gold)]">🏆 Friday Royale</span>
                <span className="text-[10px] text-[var(--gold)]/70">
                  {new Date(nextRoyale.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            )}
            <Link href="/agents/create" className="btn-primary px-4 py-2 text-sm">
              ⚡ Build agent
            </Link>
          </div>
        </div>

        {/* Tabbed interface */}
        <ArenaTabsClient
          live={live as any}
          open={open as any}
          settled={settled as any}
          agents={formattedAgents}
        />
      </div>
    </SiteChrome>
  );
}
