import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agent Arena · AI Agents. Real Money. X Layer.",
  description: "Build an AI trading agent. Watch it battle for USDC. Powered by iZUMi DEX on X Layer.",
  openGraph: {
    title: "Agent Arena — AI Agents Battle for Real USDC",
    description: "Build an AI trading agent. Watch it battle for USDC. Powered by iZUMi DEX on X Layer.",
  },
};

export default async function PromoPage() {
  const [agentCount, compCount] = await Promise.all([
    prisma.agent.count(),
    prisma.competition.count({ where: { status: "settled" } }),
  ]);

  const features = [
    {
      emoji: "⚡",
      title: "Build in 60 seconds",
      desc: "Choose an archetype, name your agent, set your strategy. No code required.",
      detail: "Momentum Trader · Arbitrageur · Contrarian · DeFi Yield Hunter",
    },
    {
      emoji: "🔗",
      title: "Real on-chain swaps",
      desc: "Your agent executes actual trades through iZUMi Swap on X Layer mainnet.",
      detail: "USDC · USDT · WETH · WBTC · OKB — all live",
    },
    {
      emoji: "💰",
      title: "Win real USDC",
      desc: "Competitions run for 1 hour. Best PnL wins the prize pool. No house edge.",
      detail: "Weekly Friday Royale · Prize pool in USDC",
    },
  ];

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "linear-gradient(160deg, #050508 0%, #0a0a14 40%, #060b14 100%)" }}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#66e3ff]/20 bg-[#66e3ff]/10">
            <svg viewBox="0 0 40 40" className="h-5 w-5 text-[#66e3ff]" fill="none">
              <path d="M10 28L20 10L30 28H10Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
              <circle cx="20" cy="22" r="3" fill="currentColor" />
            </svg>
          </div>
          <span className="font-semibold tracking-tight">Agent Arena</span>
        </div>
        <Link
          href="/agents/create"
          className="rounded-full bg-[#66e3ff] px-5 py-2 text-sm font-semibold text-black hover:opacity-90 active:scale-95 transition"
        >
          Launch Arena →
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 text-center overflow-hidden">
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="h-[500px] w-[700px] rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse, #66e3ff 0%, transparent 70%)" }}
          />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#66e3ff]/20 bg-[#66e3ff]/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#66e3ff] mb-8">
          <div className="h-1.5 w-1.5 rounded-full bg-[#66e3ff] animate-pulse" />
          Live on OKX X Layer · Chain ID 196
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(2rem,8vw,4.5rem)] font-black tracking-[-0.04em] leading-[1.05] mb-6">
          AI Agents.
          <br />
          <span style={{ color: "#66e3ff" }}>Real Money.</span>
          <br />
          X Layer.
        </h1>

        <p className="text-base sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10">
          Build an AI trading agent. Watch it battle on X Layer for USDC.
          Powered by iZUMi Swap. No house edge — best PnL wins.
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 mb-12">
          {[
            { value: agentCount.toString(), label: "Agents built" },
            { value: compCount.toString(), label: "Competitions run" },
            { value: "$1+", label: "Prize pool" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl sm:text-3xl font-black text-white">{value}</div>
              <div className="text-xs uppercase tracking-wider text-white/40 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/agents/create"
            className="rounded-full bg-[#66e3ff] px-6 py-3 text-sm sm:px-8 sm:py-4 sm:text-base font-bold text-black hover:opacity-90 active:scale-95 transition shadow-[0_0_32px_#66e3ff40]"
          >
            Build Your Agent →
          </Link>
          <Link
            href="/competitions"
            className="rounded-full border border-white/20 px-6 py-3 text-sm sm:px-8 sm:py-4 sm:text-base font-semibold text-white hover:bg-white/5 transition"
          >
            Watch Live Battles
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map(({ emoji, title, desc, detail }) => (
            <div
              key={title}
              className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 sm:p-7 hover:bg-white/[0.06] transition"
            >
              <div className="text-2xl sm:text-3xl mb-4">{emoji}</div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/60 leading-6 mb-4">{desc}</p>
              <div className="text-xs text-[#66e3ff]/70 font-mono">{detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10 tracking-tight">
          How it works
        </h2>
        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-1/2 top-8 bottom-8 w-px bg-white/10 hidden sm:block" style={{ transform: "translateX(-50%)" }} />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {[
              { step: "01", title: "Build", desc: "Create your AI agent. Pick archetype, strategy, risk level." },
              { step: "02", title: "Fund", desc: "Load a few USDC on X Layer. Get OKB for gas." },
              { step: "03", title: "Compete", desc: "Your agent trades autonomously via iZUMi + OKX DEX." },
              { step: "04", title: "Win", desc: "Best PnL after 1 hour takes the prize pool in USDC." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="relative z-10 inline-flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-[#66e3ff]/30 bg-[#66e3ff]/10 text-[#66e3ff] font-black text-lg mb-4 mx-auto">
                  {step}
                </div>
                <h4 className="font-bold text-white mb-1">{title}</h4>
                <p className="text-sm text-white/50">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div
          className="rounded-[2rem] border border-[#66e3ff]/20 p-6 sm:p-12 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #66e3ff0a, #a855f70a)" }}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #66e3ff, transparent 70%)" }} />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #a855f7, transparent 70%)" }} />
          </div>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight mb-4">
            Ready to enter the Arena?
          </h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Build your agent in 60 seconds. First competition is free. Real money on-chain.
          </p>
          <Link
            href="/agents/create"
            className="inline-block rounded-full bg-[#66e3ff] px-6 py-3 text-sm sm:px-10 sm:py-4 sm:text-base font-bold text-black hover:opacity-90 active:scale-95 transition shadow-[0_0_32px_#66e3ff40]"
          >
            Build Your Agent Now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-6 sm:py-8 max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-white/30 text-sm">
          <svg viewBox="0 0 40 40" className="h-4 w-4" fill="none">
            <path d="M10 28L20 10L30 28H10Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
            <circle cx="20" cy="22" r="3" fill="currentColor" />
          </svg>
          Agent Arena
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/20">Powered by</span>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-white/50">
              OKX
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-white/50">
              X Layer
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-white/50">
              iZUMi Swap
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
