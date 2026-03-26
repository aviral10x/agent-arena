import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/arena/site-chrome";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata(props: PageProps) {
  const { id } = await props.params;
  const t = await prisma.tournament.findUnique({ where: { id }, select: { title: true } });
  return { title: t ? `${t.title} · Bracket · Agent Arena` : "Bracket · Agent Arena" };
}

export default async function TournamentBracketPage(props: PageProps) {
  const { id } = await props.params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      slots: {
        orderBy: { enrolledAt: "asc" },
        include: {
          agent: { select: { id: true, name: true, color: true, archetype: true } },
        },
      },
      competitions: {
        orderBy: { createdAt: "desc" },
        include: {
          agents: {
            include: { agent: { select: { id: true, name: true, color: true } } },
            orderBy: { score: "desc" },
          },
        },
      },
    },
  });

  if (!tournament) notFound();

  const isLive = tournament.status === "live";
  const isSettled = tournament.status === "settled";
  const spotsLeft = Math.max(0, tournament.maxAgents - tournament.currentAgents);
  const enrollmentOpen = new Date() >= tournament.enrollmentOpensAt;
  const canEnroll = !isLive && !isSettled && enrollmentOpen && spotsLeft > 0;

  const statusColor = isLive ? "#8ff5ff" : isSettled ? "#464752" : "#ffe6aa";
  const statusLabel = isLive ? "LIVE" : isSettled ? "SETTLED" : spotsLeft === 0 ? "FULL" : "ENROLLING";

  // Build bracket rounds from slots
  const slots = tournament.slots;
  const totalSlots = tournament.maxAgents;

  // Group competitions by round (use createdAt order as proxy)
  const comps = [...tournament.competitions].reverse(); // oldest first
  const liveComp = tournament.competitions.find((c) => c.status === "live");
  const latestComp = tournament.competitions[0] ?? null;

  // Pair slots into QF matches (8 agents → 4 QF matches)
  const qfPairs: (typeof slots[0] | null)[][] = [];
  for (let i = 0; i < Math.max(8, slots.length); i += 2) {
    qfPairs.push([slots[i] ?? null, slots[i + 1] ?? null]);
  }
  const qfPairsDisplay = qfPairs.slice(0, 4);

  return (
    <SiteChrome activeHref="/tournaments">
      {/* Scanline overlay */}
      <div className="scanline fixed inset-0 z-10 opacity-10 pointer-events-none" />

      {/* Dot-matrix bg */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(70,71,82,0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <main className="relative z-10 pt-4 pb-24 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">

        {/* ── Hero Header ── */}
        <section className="mb-8 relative">
          <div className="absolute -left-4 top-0 w-1 h-16" style={{ background: statusColor }} />
          <div className="flex items-center gap-3 mb-2">
            <Link href="/tournaments" className="text-[10px] font-mono uppercase tracking-widest text-[#464752] hover:text-[#aaaab6] transition-colors">
              ← Tournaments
            </Link>
            <span className="text-[#464752]">/</span>
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: statusColor }}>Bracket</span>
          </div>
          <h1
            className="font-['Space_Grotesk'] text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-2"
            style={{ color: statusColor, textShadow: `0 0 30px ${statusColor}40` }}
          >
            {tournament.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#464752]">
            <span
              className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border"
              style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}18` }}
            >
              {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full animate-ping mr-1.5 align-middle" style={{ background: statusColor }} />}
              {statusLabel}
            </span>
            {tournament.isRecurring && (
              <span className="text-[10px] font-mono text-[#ffe6aa] border border-[#ffe6aa]/30 bg-[#ffe6aa]/10 px-2 py-0.5 uppercase">
                WEEKLY
              </span>
            )}
            <span>LIVE_STREAM_ACTIVE</span>
            <span>•</span>
            <span className="text-[#ffe6aa]">{tournament.currentAgents}/{tournament.maxAgents} AGENTS</span>
          </div>
        </section>

        {/* ── Prize + Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { label: "Prize_Pool",    value: `$${tournament.prizePoolUsdc.toFixed(0)}` },
            { label: "Entry_Fee",     value: `$${tournament.entryFeeUsdc.toFixed(2)}` },
            { label: "Filled_Slots",  value: `${tournament.currentAgents}/${tournament.maxAgents}` },
            { label: "Competitions",  value: `${tournament.competitions.length}` },
          ].map((item) => (
            <div key={item.label} className="bg-[#171924] border border-[#464752]/20 p-4">
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">{item.label}</div>
              <div className="mt-1 text-xl font-bold font-mono text-[#eeecfa]">{item.value}</div>
            </div>
          ))}
        </div>

        {/* ── Bracket ── */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6 border-b border-[#464752]/10 pb-3">
            <span className="w-1.5 h-1.5 bg-[#8ff5ff]" />
            <h2 className="font-mono text-xs uppercase tracking-widest text-[#8ff5ff]">Tournament_Bracket</h2>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="flex items-stretch gap-0 min-w-[900px] justify-between">

              {/* ── Round: Quarterfinals ── */}
              <div className="flex flex-col justify-around gap-3 w-56">
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752] mb-2">Quarter_Finals</div>
                {qfPairsDisplay.map((pair, pi) => (
                  <div
                    key={pi}
                    className="bg-[#11131d] border-l border-[#8ff5ff]/40 relative"
                  >
                    {pair.map((slot, si) => (
                      <div
                        key={si}
                        className={`flex items-center gap-2 px-3 py-2.5 ${si === 0 ? "border-b border-[#464752]/10" : ""}`}
                      >
                        {slot ? (
                          <>
                            <div
                              className="h-6 w-6 shrink-0 flex items-center justify-center font-['Bebas_Neue'] text-[10px]"
                              style={{ background: `${slot.agent.color}22`, border: `1px solid ${slot.agent.color}66`, color: slot.agent.color }}
                            >
                              {slot.agent.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="truncate text-[11px] font-mono text-[#eeecfa] uppercase">{slot.agent.name}</span>
                            <span className="ml-auto text-[10px] font-mono text-[#464752]">—</span>
                          </>
                        ) : (
                          <>
                            <div className="h-6 w-6 shrink-0 border border-dashed border-[#464752]/40 flex items-center justify-center text-[#464752] text-[9px] font-mono">?</div>
                            <span className="text-[11px] font-mono text-[#464752]">TBD</span>
                          </>
                        )}
                      </div>
                    ))}
                    {/* Connector line */}
                    <div className="absolute -right-4 top-1/2 w-4 border-t border-[#8ff5ff]/20" />
                  </div>
                ))}
              </div>

              {/* ── Connector: QF→SF ── */}
              <div className="flex flex-col justify-around w-16 shrink-0">
                {[0, 1].map((i) => (
                  <div key={i} className="h-[90px] border-y border-r border-[#8ff5ff]/20" />
                ))}
              </div>

              {/* ── Round: Semifinals ── */}
              <div className="flex flex-col justify-around gap-6 w-56">
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752] mb-2">Semi_Finals</div>
                {[0, 1].map((si) => {
                  const sfComp = comps[si] ?? null;
                  const isThisSFLive = sfComp?.status === "live";
                  return (
                    <div
                      key={si}
                      className="relative"
                      style={{
                        borderLeft: isThisSFLive ? "4px solid #ff6c92" : "1px solid rgba(70,71,82,0.4)",
                        boxShadow: isThisSFLive ? "0 0 30px rgba(255,108,146,0.15)" : undefined,
                      }}
                    >
                      {sfComp ? (
                        <>
                          {sfComp.agents.map((ca, ai) => (
                            <div
                              key={ca.agent.id}
                              className={`flex items-center gap-2 px-3 py-2.5 bg-[#11131d] ${ai === 0 ? "border-b border-[#464752]/10" : ""}`}
                            >
                              <div
                                className="h-6 w-6 shrink-0 flex items-center justify-center font-['Bebas_Neue'] text-[10px]"
                                style={{ background: `${ca.agent.color}22`, border: `1px solid ${ca.agent.color}66`, color: ca.agent.color }}
                              >
                                {ca.agent.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate text-[11px] font-mono text-[#eeecfa] uppercase">{ca.agent.name}</span>
                              {isThisSFLive ? (
                                <span className="ml-auto text-[10px] font-mono text-[#ff6c92] animate-pulse">
                                  {(ca as any).score ?? 0}
                                </span>
                              ) : (
                                <span className="ml-auto text-[10px] font-mono text-[#464752]">
                                  {sfComp.winnerId === ca.agent.id ? "★" : "—"}
                                </span>
                              )}
                            </div>
                          ))}
                          {isThisSFLive && (
                            <div className="absolute -top-2 -right-2">
                              <span className="w-1.5 h-1.5 bg-[#ff6c92] rounded-full animate-ping inline-block" />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bg-[#11131d] px-3 py-4 text-[10px] font-mono text-[#464752]">Awaiting QF results</div>
                      )}
                      {/* Connector */}
                      <div className="absolute -right-4 top-1/2 w-4 border-t border-[#8ff5ff]/20" />
                    </div>
                  );
                })}
              </div>

              {/* ── Connector: SF→Finals ── */}
              <div className="flex flex-col justify-around w-16 shrink-0">
                <div className="h-[90px] border-y border-r border-[#8ff5ff]/20" style={{ marginTop: "45px" }} />
              </div>

              {/* ── Finals ── */}
              <div className="flex flex-col justify-center w-64">
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752] mb-2">Grand_Final</div>
                {(() => {
                  const finalComp = comps[comps.length - 1] ?? null;
                  const winner = finalComp?.agents.find((a) => (a as any).agent.id === finalComp.winnerId);
                  return (
                    <div
                      className="bg-[#11131d] border-2 border-[#8ff5ff]/20 relative"
                      style={{ boxShadow: isSettled ? "0 0 40px rgba(143,245,255,0.1)" : undefined }}
                    >
                      {isSettled && winner ? (
                        <>
                          <div className="p-6 text-center border-b border-[#464752]/20">
                            {/* Trophy */}
                            <div className="text-5xl mb-2">🏆</div>
                            <div
                              className="font-['Space_Grotesk'] text-xl font-black uppercase"
                              style={{ color: (winner as any).agent.color, textShadow: `0 0 20px ${(winner as any).agent.color}40` }}
                            >
                              {(winner as any).agent.name}
                            </div>
                            <div className="text-[10px] font-mono text-[#ffe6aa] mt-1 uppercase tracking-widest">CHAMPION</div>
                          </div>
                          <div className="px-4 py-3 text-center">
                            <div className="text-[9px] font-mono text-[#464752] uppercase">Prize Collected</div>
                            <div className="font-mono text-lg text-[#ffe6aa] font-bold">
                              ${tournament.winnerPrizeUsdc?.toFixed(2) ?? "—"}
                            </div>
                          </div>
                        </>
                      ) : finalComp ? (
                        <>
                          {finalComp.agents.map((ca, ai) => (
                            <div
                              key={ca.agent.id}
                              className={`flex items-center gap-2 px-3 py-3 ${ai === 0 ? "border-b border-[#464752]/10" : ""}`}
                            >
                              <div
                                className="h-7 w-7 shrink-0 flex items-center justify-center font-['Bebas_Neue'] text-sm"
                                style={{ background: `${ca.agent.color}22`, border: `1px solid ${ca.agent.color}66`, color: ca.agent.color }}
                              >
                                {ca.agent.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate text-xs font-mono text-[#eeecfa] uppercase font-bold">{ca.agent.name}</span>
                              <span className="ml-auto text-xs font-mono text-[#8ff5ff]">{(ca as any).score ?? 0}</span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="p-8 text-center">
                          <div className="text-4xl mb-3 opacity-30">🏆</div>
                          <div className="text-[10px] font-mono text-[#464752] uppercase">Finals Pending</div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </section>

        {/* ── Live competition callout ── */}
        {liveComp && (
          <section className="mb-10">
            <div
              className="bg-[#171924] border-l-4 border-[#ff6c92] p-5"
              style={{ boxShadow: "0 0 30px rgba(255,108,146,0.1)" }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 bg-[#ff6c92] rounded-full animate-ping" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff6c92]">Match_In_Progress</span>
                  </div>
                  <div className="font-['Space_Grotesk'] font-black uppercase text-[#eeecfa] text-lg">
                    {liveComp.title}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    {liveComp.agents.map((ca) => (
                      <span key={ca.agent.id} className="font-mono text-xs text-[#aaaab6]">
                        <span className="font-bold" style={{ color: ca.agent.color }}>{ca.agent.name}</span>
                        {" "}· {(ca as any).score ?? 0} pts
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/competitions/${liveComp.id}/live`}
                    className="bg-[#8ff5ff] text-[#005d63] px-5 py-2 font-['Space_Grotesk'] font-black uppercase text-xs hover:skew-x-[-6deg] transition-all"
                  >
                    Watch_Live →
                  </Link>
                  <Link
                    href={`/competitions/${liveComp.id}/bet`}
                    className="border border-[#ff6c92]/40 text-[#ff6c92] px-4 py-2 font-mono text-xs uppercase hover:bg-[#ff6c92]/10 transition-colors"
                  >
                    Place_Bet
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Entrants roster ── */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4 border-b border-[#464752]/10 pb-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-[#aaaab6]">
              Enrolled_Agents — {tournament.slots.length} Locked_In
            </h2>
            {canEnroll && (
              <Link
                href={`/tournaments/${id}/enroll`}
                className="ml-auto bg-[#8ff5ff] text-[#005d63] px-4 py-1.5 font-['Space_Grotesk'] font-black uppercase text-xs hover:skew-x-[-6deg] transition-all"
              >
                Enroll_Now →
              </Link>
            )}
          </div>

          {tournament.slots.length === 0 ? (
            <div className="border border-dashed border-[#464752]/30 px-4 py-8 text-center text-xs font-mono text-[#464752]">
              No entrants yet. First agent gets pole position.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {tournament.slots.map((slot) => (
                <Link
                  key={slot.id}
                  href={`/agents/${slot.agent.id}`}
                  className="flex items-center gap-3 bg-[#171924] border border-[#464752]/10 px-3 py-3 hover:bg-[#1d1f2b] transition-colors"
                  style={{ borderLeftWidth: "2px", borderLeftColor: slot.agent.color }}
                >
                  <div
                    className="h-8 w-8 shrink-0 flex items-center justify-center font-['Bebas_Neue'] text-sm"
                    style={{ background: `${slot.agent.color}22`, border: `1px solid ${slot.agent.color}66`, color: slot.agent.color }}
                  >
                    {slot.agent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs font-bold text-[#eeecfa] uppercase">{slot.agent.name}</div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-[#464752]">{slot.agent.archetype}</div>
                  </div>
                </Link>
              ))}
              {/* Empty slots */}
              {Array.from({ length: Math.max(0, spotsLeft) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-3 border border-dashed border-[#464752]/20 px-3 py-3"
                >
                  <div className="h-8 w-8 shrink-0 border border-dashed border-[#464752]/40 flex items-center justify-center text-[#464752] text-xs font-mono">?</div>
                  <div className="text-[11px] font-mono text-[#464752]">Open_Slot</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Match history ── */}
        {tournament.competitions.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4 border-b border-[#464752]/10 pb-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-[#aaaab6]">Match_History</h2>
            </div>
            <div className="space-y-2">
              {tournament.competitions.map((comp) => {
                const cColor = comp.status === "live" ? "#8ff5ff" : comp.status === "settled" ? "#464752" : "#ffe6aa";
                return (
                  <Link
                    key={comp.id}
                    href={`/competitions/${comp.id}`}
                    className="flex items-center gap-4 bg-[#171924] border border-[#464752]/10 px-4 py-3 hover:bg-[#1d1f2b] transition-colors"
                  >
                    <div className="h-2 w-2 shrink-0" style={{ background: cColor }} />
                    <span className="flex-1 truncate font-mono text-xs text-[#eeecfa]">{comp.title}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      {comp.agents.map((ca) => (
                        <span key={ca.agent.id} className="font-mono text-[10px]" style={{ color: ca.agent.color }}>
                          {ca.agent.name.slice(0, 8)} · {(ca as any).score ?? 0}
                        </span>
                      ))}
                      <span
                        className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border"
                        style={{ color: cColor, borderColor: `${cColor}40`, background: `${cColor}18` }}
                      >
                        {comp.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </SiteChrome>
  );
}
