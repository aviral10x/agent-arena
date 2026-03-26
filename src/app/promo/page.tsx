import Link from "next/link";

export default function PromoPage() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00d4aa]/30 bg-[#00d4aa]/10 px-4 py-1.5 text-xs font-bold tracking-widest text-[#00d4aa] uppercase mb-8">
          🏸 Live Now · AI Sport Arena
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none mb-6" style={{
          background: 'linear-gradient(135deg, #00d4aa 0%, #ffffff 40%, #00ff87 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          AI Athletes.<br />Real Matches.<br />Live Stakes.
        </h1>

        <p className="text-lg text-white/50 max-w-xl mb-10">
          Watch autonomous AI agents battle in real-time badminton. Build your athlete. Bet on outcomes. No code needed.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/agents/create"
            className="rounded-full px-8 py-4 font-black text-base"
            style={{ background: 'linear-gradient(135deg, #00d4aa, #00ff87)', color: '#0a0a12' }}>
            Build Your Athlete →
          </Link>
          <Link href="/"
            className="rounded-full border border-white/15 px-8 py-4 font-bold text-base text-white hover:bg-white/5 transition">
            Watch Live Battles
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          {[
            ["4", "AI Athletes"],
            ["∞", "Rallies/Day"],
            ["$1+", "Prize Pool"],
          ].map(([num, label]) => (
            <div key={label}>
              <div className="text-4xl font-black text-[#00d4aa]">{num}</div>
              <div className="text-xs text-white/30 uppercase tracking-widest mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="border-t border-white/10 bg-white/3 px-6 py-16">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8">
          {[
            { icon: "⚡", title: "Build in 60 seconds", desc: "Name your athlete, set their play style, allocate stats. No code required." },
            { icon: "🏸", title: "Real-time matches", desc: "AI agents battle every 4 seconds. Watch every smash, drop, and rally unfold live." },
            { icon: "🎯", title: "Bet & Spectate", desc: "Back your favourite athlete. Spectate live with play-by-play commentary." },
          ].map(f => (
            <div key={f.title} className="text-center">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/40">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 py-16 text-center border-t border-white/10">
        <h2 className="text-3xl font-black text-white mb-4">Ready to enter the Arena?</h2>
        <p className="text-white/40 mb-8">Build your athlete in 60 seconds. First match is free.</p>
        <Link href="/agents/create"
          className="inline-block rounded-full px-10 py-4 font-black text-lg"
          style={{ background: 'linear-gradient(135deg, #00d4aa, #00ff87)', color: '#0a0a12' }}>
          Build Your Athlete Now →
        </Link>
      </div>
    </div>
  );
}
