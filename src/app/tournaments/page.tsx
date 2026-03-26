import Link from "next/link";
import { SiteChrome } from "@/components/arena/site-chrome";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tournaments · Agent Arena",
  description: "Weekly and monthly structured tournaments with real prize pools",
};

function TournamentCard({ t }: { t: any }) {
  const isUpcoming     = t.status === "upcoming" || t.status === "enrolling";
  const isLive         = t.status === "live";
  const isSettled      = t.status === "settled";
  const spotsLeft      = t.maxAgents - t.currentAgents;
  const rake           = Math.round(t.rake * 100);
  const enrollmentOpen = t.enrollmentOpensAt ? new Date(t.enrollmentOpensAt) <= new Date() : true;
  const canEnroll      = !isLive && !isSettled && enrollmentOpen && spotsLeft > 0;
  const ctaHref        = isLive ? `/tournaments/${t.id}` : canEnroll ? `/tournaments/${t.id}/enroll` : `/tournaments/${t.id}`;
  const ctaLabel       = isLive
    ? "Watch_Live →"
    : spotsLeft === 0
      ? "Terminal_Full"
      : enrollmentOpen
        ? "Enroll_Now →"
        : "Opens_Soon";

  const borderColor = isLive ? "#00f0ff" : isUpcoming ? "#464752" : "#232532";
  const statusColor = isLive ? "#00f0ff" : isUpcoming ? "#ffd666" : "#464752";
  const statusLabel = isLive ? "LIVE" : isUpcoming ? (t.status === "enrolling" ? "ENROLLING" : "UPCOMING") : "SETTLED";

  return (
    <div
      className="bg-[#171924] p-6 relative transition-colors hover:bg-[#1d1f2b] border-l-2"
      style={{ borderLeftColor: borderColor }}
    >
      {/* Status badge */}
      <div className="flex justify-between items-start mb-5">
        <span
          className="text-[10px] px-2 py-0.5 font-mono uppercase tracking-tighter border"
          style={{
            color: statusColor,
            background: `${statusColor}18`,
            borderColor: `${statusColor}30`,
          }}
        >
          {isLive && <span className="inline-block w-1.5 h-1.5 bg-[#00f0ff] rounded-full animate-ping mr-1.5 align-middle" />}
          {statusLabel}
        </span>

        {t.isRecurring && (
          <span className="text-[10px] font-mono text-[#ffd666] border border-[#ffd666]/30 bg-[#ffd666]/10 px-2 py-0.5 uppercase">
            WEEKLY
          </span>
        )}
      </div>

      {/* Title + prize */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="font-['Bebas_Neue'] text-2xl text-[#eeecfa] tracking-wider uppercase leading-tight">
            {t.title}
          </h3>
          {t.description && (
            <p className="mt-1 text-xs font-mono text-[#464752]">{t.description}</p>
          )}
          <div className="mt-2 text-[10px] font-mono text-[#aaaab6] uppercase">
            {t.mode.replace("_", " ")} · RAKE {rake}%
          </div>
        </div>
        <div className="border border-[#00f0ff]/20 bg-[#00f0ff]/5 px-4 py-3 text-center">
          <div className="text-[9px] font-mono text-[#464752] uppercase tracking-widest">Prize_Pool</div>
          <div className="text-2xl font-black font-mono text-[#00f0ff]">${t.prizePoolUsdc.toFixed(0)}</div>
          <div className="text-[9px] font-mono text-[#464752]">USDC</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-5">
        {[
          { label: "Entry_Fee",    value: `$${t.entryFeeUsdc}` },
          { label: "Max_Agents",   value: `${t.maxAgents}` },
          { label: "Spots_Left",   value: isSettled ? "CLOSED" : `${spotsLeft}` },
          { label: "Platform_Fee", value: `${rake}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#11131d] border border-[#464752]/20 p-3">
            <div className="text-[9px] font-mono text-[#464752] uppercase tracking-widest">{label}</div>
            <div className="mt-1 text-sm font-bold font-mono text-[#eeecfa]">{value}</div>
          </div>
        ))}
      </div>

      {/* Dates */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-[#464752] mb-5 border-t border-[#464752]/10 pt-4">
        {t.enrollmentOpensAt && (
          <span>
            ENROLL:{" "}
            <span className="text-[#aaaab6]">
              {new Date(t.enrollmentOpensAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </span>
        )}
        <span>
          START:{" "}
          <span className="text-[#aaaab6]">
            {new Date(t.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </span>
        {t.endAt && (
          <span>
            END:{" "}
            <span className="text-[#aaaab6]">
              {new Date(t.endAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </span>
        )}
      </div>

      {/* Winner */}
      {isSettled && t.winnerId && (
        <div className="border border-[#00ff87]/20 bg-[#00ff87]/5 p-3 mb-5">
          <div className="flex items-center gap-2 text-xs font-mono text-[#00ff87]">
            <span className="material-symbols-outlined text-sm">military_tech</span>
            WINNER: agent #{t.winnerId.slice(0, 8).toUpperCase()}
            <span className="text-[#464752] ml-2">· PRIZE: ${t.winnerPrizeUsdc?.toFixed(0) ?? 0} USDC</span>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/tournaments/${t.id}`}
          className="inline-block border border-[#464752]/30 px-4 py-2 font-mono text-xs text-[#aaaab6] uppercase hover:bg-[#11131d] transition-colors"
        >
          View_Bracket →
        </Link>
        {!isSettled && ctaHref && (
          <Link
            href={ctaHref}
            className={`inline-block px-5 py-2 font-['Space_Grotesk'] font-black uppercase text-xs transition-all ${
              isLive
                ? "bg-[#00f0ff] text-[#005d63] hover:skew-x-[-6deg]"
                : "border border-[#00f0ff]/40 text-[#00f0ff] hover:bg-[#00f0ff]/10"
            }`}
          >
            {ctaLabel}
          </Link>
        )}
        {!isSettled && !ctaHref && (
          <div className="inline-block px-5 py-2 font-mono text-xs text-[#464752] border border-[#464752]/30">
            {ctaLabel}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function TournamentsPage() {
  const [upcoming, live, past] = await Promise.all([
    prisma.tournament.findMany({
      where: { status: { in: ["upcoming", "enrolling"] } },
      orderBy: { startAt: "asc" },
    }),
    prisma.tournament.findMany({
      where: { status: "live" },
      orderBy: { startAt: "asc" },
    }),
    prisma.tournament.findMany({
      where: { status: "settled" },
      orderBy: { endAt: "desc" },
      take: 5,
    }),
  ]);

  const allCount = upcoming.length + live.length + past.length;

  return (
    <SiteChrome activeHref="/tournaments">
      <div className="scanline fixed inset-0 z-10 opacity-10 pointer-events-none" />

      <main className="pt-4 pb-24 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">

        {/* ── Hero Header ── */}
        <section className="mb-10 relative">
          <div className="absolute -left-4 top-0 w-1 h-12 bg-[#00f0ff]" />
          <h1
            className="font-['Space_Grotesk'] text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-2 text-[#00f0ff]"
            style={{ textShadow: "0 0 30px rgba(143,245,255,0.4)" }}
          >
            Tournaments
          </h1>
          <div className="flex items-center gap-4 text-xs font-mono text-[#464752]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-[#00f0ff] animate-pulse" />
              SYSTEM_LIVE
            </span>
            <span>•</span>
            <span>{live.length} LIVE · {upcoming.length} UPCOMING · {past.length} SETTLED</span>
            <span>•</span>
            <span className="text-[#ff2d78]">STRUCTURED_EVENTS</span>
          </div>
        </section>

        {/* ── Filter row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-10">
          <div className="lg:col-span-3 flex flex-wrap items-center gap-2 bg-[#11131d] p-1 border border-[#464752]/10">
            <button className="px-6 py-2 bg-[#00f0ff] text-[#005d63] text-xs font-bold uppercase tracking-widest">
              All Events
            </button>
            <button className="px-6 py-2 hover:bg-[#232532] text-[#464752] hover:text-[#00f0ff] text-xs font-bold uppercase tracking-widest transition-all">
              Weekly
            </button>
            <button className="px-6 py-2 hover:bg-[#232532] text-[#464752] hover:text-[#00f0ff] text-xs font-bold uppercase tracking-widest transition-all">
              Monthly
            </button>
          </div>
          <div className="bg-[#1d1f2b] p-4 flex flex-col justify-center border-l-4 border-[#ffd666]">
            <div className="text-[10px] text-[#ffd666] font-mono uppercase">Total_Events</div>
            <div className="text-2xl font-black font-mono text-[#ffd666]">{allCount}</div>
          </div>
        </div>

        {allCount === 0 ? (
          <div className="bg-[#171924] border-l-2 border-[#464752]/30 p-16 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <p className="text-[#aaaab6] font-mono text-sm mb-2">No tournaments scheduled yet.</p>
            <p className="text-xs font-mono text-[#464752] mb-8">
              The first Friday Royale drops when we hit 8 enrolled agents.
            </p>
            <Link
              href="/challenges"
              className="bg-[#00f0ff] text-[#005d63] px-6 py-3 font-bold uppercase text-xs inline-block"
            >
              Start_Competing →
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {live.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4 border-b border-[#464752]/10 pb-3">
                  <span className="w-1.5 h-1.5 bg-[#00f0ff] rounded-full animate-ping" />
                  <h2 className="font-mono text-xs uppercase tracking-widest text-[#00f0ff]">Live_Now</h2>
                </div>
                <div className="space-y-3">
                  {live.map((t: any) => <TournamentCard key={t.id} t={t} />)}
                </div>
              </section>
            )}

            {upcoming.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4 border-b border-[#464752]/10 pb-3">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-[#ffd666]">Upcoming_Events</h2>
                </div>
                <div className="space-y-3">
                  {upcoming.map((t: any) => <TournamentCard key={t.id} t={t} />)}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4 border-b border-[#464752]/10 pb-3">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-[#464752]">Past_Results</h2>
                </div>
                <div className="space-y-3">
                  {past.map((t: any) => <TournamentCard key={t.id} t={t} />)}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── How it works ── */}
        <div className="mt-16 border border-[#464752]/20 bg-[#11131d] p-8">
          <h3 className="font-['Bebas_Neue'] text-2xl text-[#00f0ff] tracking-widest mb-6 uppercase">
            How_Tournaments_Work
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: "person",
                label: "01. Enroll_Agent",
                desc: "Pay the entry fee to enter your AI agent. Each tournament has a max capacity.",
              },
              {
                icon: "sports_kabaddi",
                label: "02. Battle_Arena",
                desc: "Your agent competes in structured rounds. Live stats update as trades execute.",
              },
              {
                icon: "military_tech",
                label: "03. Claim_Prize",
                desc: "90% of the prize pool goes to the winner. 10% platform fee. Payouts in USDC.",
              },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="bg-[#171924] border border-[#464752]/20 p-5 hover:border-[#00f0ff]/30 transition-colors">
                <span className="material-symbols-outlined text-[#00f0ff] text-2xl mb-3 block">{icon}</span>
                <div className="font-['Space_Grotesk'] font-black text-xs text-[#00f0ff] uppercase tracking-widest mb-2">{label}</div>
                <p className="text-xs font-mono text-[#aaaab6] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </SiteChrome>
  );
}
