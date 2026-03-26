import Link from "next/link";

export default function PromoPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-void)', color: 'var(--white-crisp)' }}>

      {/* Subtle grid lines */}
      <div className="pointer-events-none fixed inset-0 arena-overlay-grid" aria-hidden />

      {/* Animated scan-line */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden style={{ zIndex: 1 }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, var(--neon-cyan), transparent)',
          opacity: 0.4,
          animation: 'scan-line 8s linear infinite',
        }} />
      </div>

      {/* Hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-20 text-center" style={{ zIndex: 2 }}>

        {/* Live badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase mb-8"
          style={{
            border: '1px solid rgba(0,240,255,0.3)',
            background: 'rgba(0,240,255,0.06)',
            color: 'var(--neon-cyan)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span className="relative">
            <span className="block w-2 h-2 rounded-full" style={{ background: 'var(--neon-green)' }} />
            <span className="absolute inset-0 rounded-full" style={{ background: 'var(--neon-green)', animation: 'live-ping 1.5s ease-in-out infinite' }} />
          </span>
          🏸 Live Now · AI Sport Arena
        </div>

        {/* Grand championship headline */}
        <h1
          className="leading-none mb-4"
          style={{
            fontFamily: 'var(--font-drama)',
            fontSize: 'clamp(3rem, 12vw, 9rem)',
            letterSpacing: '0.04em',
            background: 'linear-gradient(135deg, #00f0ff 0%, #ffffff 45%, #ff2d78 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          GRAND<br />CHAMPIONSHIP
        </h1>

        {/* Static score display */}
        <div className="flex items-center gap-6 mb-10">
          <span
            className="tabular-nums leading-none"
            style={{ fontFamily: 'var(--font-drama)', fontSize: '5rem', color: 'var(--agent-1)', textShadow: '0 0 20px var(--agent-1), 0 0 40px rgba(102,227,255,0.4)' }}
          >
            42
          </span>
          <div style={{ width: '2px', height: '60px', background: 'var(--neon-cyan)', boxShadow: '0 0 8px var(--neon-cyan), 0 0 20px rgba(0,240,255,0.5)', borderRadius: '1px' }} />
          <span
            className="tabular-nums leading-none"
            style={{ fontFamily: 'var(--font-drama)', fontSize: '5rem', color: 'var(--agent-2)', textShadow: '0 0 20px var(--agent-2), 0 0 40px rgba(176,164,255,0.4)' }}
          >
            38
          </span>
        </div>

        <p
          className="text-lg max-w-xl mb-10"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--grey-data)' }}
        >
          Watch autonomous AI agents battle in real-time badminton. Build your athlete. Bet on outcomes. No code needed.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/agents/create"
            className="rounded-full px-8 py-4 font-black text-base"
            style={{
              background: 'var(--neon-cyan)',
              color: '#000',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              boxShadow: '0 0 20px rgba(0,240,255,0.4), 0 0 40px rgba(0,240,255,0.2)',
              textTransform: 'uppercase',
            }}
          >
            Build Your Athlete →
          </Link>
          <Link
            href="/"
            className="rounded-full px-8 py-4 font-bold text-base transition"
            style={{
              border: '1px solid rgba(0,240,255,0.2)',
              color: 'var(--white-crisp)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
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
              <div className="text-4xl font-black" style={{ fontFamily: 'var(--font-drama)', color: 'var(--neon-cyan)', textShadow: '0 0 20px rgba(0,240,255,0.4)' }}>{num}</div>
              <div className="text-xs uppercase tracking-widest mt-1" style={{ color: 'var(--grey-data)', fontFamily: 'var(--font-mono)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="relative px-6 py-16" style={{ zIndex: 2, borderTop: '1px solid rgba(0,240,255,0.08)', background: 'rgba(10,11,20,0.6)' }}>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8">
          {[
            { icon: "⚡", title: "Build in 60 seconds", desc: "Name your athlete, set their play style, allocate stats. No code required." },
            { icon: "🏸", title: "Real-time matches", desc: "AI agents battle every 4 seconds. Watch every smash, drop, and rally unfold live." },
            { icon: "🎯", title: "Bet & Spectate", desc: "Back your favourite athlete. Spectate live with play-by-play commentary." },
          ].map(f => (
            <div key={f.title} className="text-center">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--white-crisp)', letterSpacing: '0.06em' }}>{f.title}</h3>
              <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--grey-data)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative px-6 py-16 text-center" style={{ zIndex: 2, borderTop: '1px solid rgba(0,240,255,0.08)' }}>
        <h2
          className="mb-4"
          style={{ fontFamily: 'var(--font-drama)', fontSize: '2.5rem', color: 'var(--white-crisp)', letterSpacing: '0.06em' }}
        >
          READY TO ENTER THE ARENA?
        </h2>
        <p className="mb-8" style={{ fontFamily: 'var(--font-body)', color: 'var(--grey-data)' }}>
          Build your athlete in 60 seconds. First match is free.
        </p>
        <Link
          href="/agents/create"
          className="inline-block rounded-full px-10 py-4 font-black text-lg"
          style={{
            background: 'var(--neon-cyan)',
            color: '#000',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            boxShadow: '0 0 20px rgba(0,240,255,0.4), 0 0 60px rgba(0,240,255,0.2)',
            textTransform: 'uppercase',
          }}
        >
          Build Your Athlete Now →
        </Link>
      </div>
    </div>
  );
}
