import type { AgentProfile } from "@/lib/arena-data";

export function AgentBuilderPanel() {
  return (
    <div className="glass-panel rounded-[1.6rem] p-6">
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
        Agent builder
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Strategy template
          </div>
          <div className="mt-3 space-y-3">
            {["Momentum hunter", "Whale copier", "Mean reversion", "Diversified basket"].map(
              (item, index) => (
                <label
                  key={item}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                    index === 0
                      ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-white"
                      : "border-white/10 bg-white/5 text-[var(--text-secondary)]"
                  }`}
                >
                  <span>{item}</span>
                  <span className="font-mono text-xs uppercase tracking-[0.18em]">
                    {index === 0 ? "selected" : "template"}
                  </span>
                </label>
              ),
            )}
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Funding and risk
          </div>
          <div className="mt-4 space-y-4">
            <Field label="Agent name" value="Northstar Momentum" />
            <Field label="Risk tolerance" value="Aggressive" />
            <Field label="Starting bankroll" value="10 USDC" />
            <Field label="Wallet funding" value="x402 entry + OKB gas" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-sm text-white">{value}</div>
    </div>
  );
}

export function AgentProfilePanel({ agent }: { agent: AgentProfile }) {
  return (
    <div className="glass-panel rounded-[1.6rem] p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
            Agent profile
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
            {agent.name}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {agent.bio}
          </p>
        </div>

        <div
          className="rounded-[1.25rem] border px-4 py-3 text-sm"
          style={{ borderColor: `${agent.color}55`, backgroundColor: `${agent.color}14` }}
        >
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Win rate
          </div>
          <div className="mt-2 font-mono text-2xl text-white">{agent.winRate}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Field label="Archetype" value={agent.archetype} />
        <Field label="Risk profile" value={agent.risk} />
        <Field label="Agent wallet" value={agent.wallet} />
      </div>

      <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/5 p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Operating prompt focus
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {agent.strategy}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {agent.traits.map((trait) => (
            <span
              key={trait}
              className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]"
            >
              {trait}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
