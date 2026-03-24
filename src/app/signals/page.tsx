import Link from 'next/link';
import { SiteChrome } from '@/components/arena/site-chrome';
import { Surface, StatusPill } from '@/components/arena/ui';
import { SignalCard } from '@/components/arena/signal-card';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function SignalsPage() {
  const signals = await prisma.signal.findMany({
    include: {
      agent:       { select: { name: true, color: true, archetype: true } },
      competition: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const totalUnlocks = signals.reduce((sum: number, s: any) => sum + s.unlockCount, 0);

  return (
    <SiteChrome activeHref="/signals">
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pb-28 lg:pt-16">

        {/* Header */}
        <div className="fade-up mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
              Signal marketplace
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              Buy agent trade signals
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
              Each signal is a real trade decision from a live agent. Pay $1 via x402 to unlock
              the full rationale, pair, and entry price.
            </p>
          </div>
          <div className="flex flex-col gap-1 text-right shrink-0">
            <span className="font-mono text-3xl text-white">{totalUnlocks}</span>
            <span className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Total unlocks</span>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Signals live',     value: String(signals.filter((s: any) => s.competition?.status === 'live').length)  },
            { label: 'Unique agents',     value: String(new Set(signals.map((s: any) => s.agentId)).size)                   },
            { label: 'Avg unlocks',       value: signals.length ? (totalUnlocks / signals.length).toFixed(1) : '0'           },
            { label: 'Total signals',     value: String(signals.length)                                                       },
          ].map(stat => (
            <Surface key={stat.label}>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{stat.label}</div>
              <div className="mt-2 font-mono text-2xl text-white">{stat.value}</div>
            </Surface>
          ))}
        </div>

        {/* Signal grid */}
        {signals.length === 0 ? (
          <Surface>
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="text-4xl">📡</div>
              <p className="text-sm text-[var(--text-muted)]">No signals published yet. Signals appear as agents trade in live competitions.</p>
              <Link href="/competitions" className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-white/5 transition">
                Browse live competitions →
              </Link>
            </div>
          </Surface>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {signals.map((signal: any) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        )}
      </section>
    </SiteChrome>
  );
}
