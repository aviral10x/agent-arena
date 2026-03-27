"use client";

import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import type { AgentProfile } from "@/lib/arena-data";

const STRATEGY_TEMPLATES = [
  {
    id: "momentum",
    label: "Momentum hunter",
    archetype: "Breakout hunter",
    description:
      "Buys tokens showing accelerating volume and clean breakout structure, then exits when momentum cools.",
    traits: ["Volume spikes", "Fast exits", "Meme beta"],
  },
  {
    id: "whale",
    label: "Whale copier",
    archetype: "Signal copier",
    description:
      "Mirrors high-signal wallet movements pulled from OKX smart-money streams.",
    traits: ["Whale mirroring", "Flow filters", "Event driven"],
  },
  {
    id: "mean-reversion",
    label: "Mean reversion",
    archetype: "Contrarian scalper",
    description:
      "Fades exhaustion and buys oversold reversion setups using compression and support tests.",
    traits: ["RSI extremes", "Tight stops", "Range bias"],
  },
  {
    id: "diversified",
    label: "Diversified basket",
    archetype: "Portfolio balancer",
    description:
      "Maintains a diversified basket and rebalances aggressively when one leg exceeds target risk.",
    traits: ["Risk caps", "Rebalancing", "Cash buffers"],
  },
] as const;

const RISK_OPTIONS = ["Conservative", "Moderate", "Aggressive"] as const;

const BANKROLL_OPTIONS = [
  { label: "0.50 USDC", value: "0.5" },
  { label: "1 USDC", value: "1" },
  { label: "2 USDC", value: "2" },
  { label: "5 USDC", value: "5" },
] as const;

type AgentFormState = {
  name: string;
  strategy: (typeof STRATEGY_TEMPLATES)[number]["id"];
  risk: (typeof RISK_OPTIONS)[number];
  bankroll: string;
};

export function AgentBuilderPanel() {
  const router = useRouter();
  const { connected: isConnected, connect } = useWallet();

  const [clientMounted, setClientMounted] = useState(false);
  useEffect(() => { setClientMounted(true); }, []);

  const [form, setForm] = useState<AgentFormState>({
    name: "",
    strategy: "momentum",
    risk: "Aggressive",
    bankroll: "1",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = STRATEGY_TEMPLATES.find(
    (t) => t.id === form.strategy
  )!;

  const updateField = useCallback(
    <K extends keyof AgentFormState>(key: K, value: AgentFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!form.name.trim()) {
        setError("Agent name is required.");
        return;
      }

      if (form.name.trim().length < 3) {
        setError("Agent name must be at least 3 characters.");
        return;
      }

      setSubmitting(true);
      setError(null);

      try {
        // For now, create a deterministic slug from the name
        const slug = form.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            strategy: selectedTemplate.id,
            archetype: selectedTemplate.archetype,
            description: selectedTemplate.description,
            traits: [...selectedTemplate.traits],
            risk: form.risk,
            bankroll: form.bankroll,
            // Mock wallet/owner for now until Phase 2
            color: "#66E3FF",
            owner: "Arena Guest",
            wallet: "0x000...0000",
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to create agent");
        }

        setSubmitted(true);

        // Redirect to competitions browse after a short delay
        setTimeout(() => {
          router.push("/competitions");
        }, 1200);
      } catch {
        setError("Failed to create agent. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, selectedTemplate, router]
  );

  if (submitted) {
    return (
      <div className="glass-panel rounded-[1.6rem] p-6">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--green-soft)]">
            <svg
              className="h-8 w-8 text-[var(--green)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <div className="text-xl font-semibold text-white">
              {form.name} is ready
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Your {selectedTemplate.label.toLowerCase()} agent has been created.
              Redirecting to competitions…
            </p>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {selectedTemplate.traits.map((trait) => (
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

  // FIX 5.2: show wallet connect prompt if not connected (skip on SSR)
  if (clientMounted && !isConnected) {
    return (
      <div className="glass-panel rounded-[1.6rem] p-8 flex flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-3xl">
          🔗
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Connect your wallet</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            You need an X Layer wallet to deploy an agent and pay the x402 entry fee.
          </p>
        </div>
        <button
          onClick={connect}
          className="border border-[#8ff5ff]/30 px-4 py-2 text-sm font-mono uppercase text-[#8ff5ff] hover:bg-[#8ff5ff]/10 transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel rounded-[1.6rem] p-6"
    >
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
        Agent builder
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1.5fr]">
        {/* Strategy Template */}
        <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Strategy template
          </div>
          <div className="mt-3 space-y-3">
            {STRATEGY_TEMPLATES.map((template) => (
              <label
                key={template.id}
                className={`flex cursor-pointer flex-col gap-2 rounded-2xl border px-4 py-3 text-sm transition-colors sm:flex-row sm:items-center sm:justify-between ${
                  form.strategy === template.id
                    ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-white"
                    : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:bg-white/[0.08]"
                }`}
                onClick={() => updateField("strategy", template.id)}
              >
                <span className="font-medium">{template.label}</span>
                <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.18em] opacity-80">
                  {form.strategy === template.id ? "selected" : "template"}
                </span>
              </label>
            ))}
          </div>

          {/* Selected strategy preview */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--cyan)]">
              {selectedTemplate.archetype}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {selectedTemplate.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTemplate.traits.map((trait) => (
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

        {/* Funding and Risk */}
        <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Funding and risk
          </div>
          <div className="mt-4 space-y-4">
            {/* Agent Name */}
            <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <label
                htmlFor="agent-name"
                className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]"
              >
                Agent name
              </label>
              <input
                id="agent-name"
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Northstar Momentum"
                maxLength={40}
                className="mt-2 w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>

            {/* Risk Tolerance */}
            <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Risk tolerance
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {RISK_OPTIONS.map((risk) => (
                  <button
                    key={risk}
                    type="button"
                    onClick={() => updateField("risk", risk)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors ${
                      form.risk === risk
                        ? risk === "Conservative"
                          ? "bg-[var(--cyan-soft)] text-[var(--cyan)]"
                          : risk === "Moderate"
                            ? "bg-[var(--gold-soft)] text-[var(--gold)]"
                            : "bg-[var(--red-soft)] text-[var(--red)]"
                        : "border border-white/10 bg-white/5 text-[var(--text-secondary)] hover:bg-white/[0.08]"
                    }`}
                  >
                    {risk}
                  </button>
                ))}
              </div>
            </div>

            {/* Starting Bankroll */}
            <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Starting bankroll
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {BANKROLL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("bankroll", option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors ${
                      form.bankroll === option.value
                        ? "bg-[var(--green-soft)] text-[var(--green)]"
                        : "border border-white/10 bg-white/5 text-[var(--text-secondary)] hover:bg-white/[0.08]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallet Funding */}
            <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Wallet funding
              </div>
              <div className="mt-2 text-sm text-white">
                x402 entry + OKB gas
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 rounded-2xl border border-[var(--red)]/30 bg-[var(--red-soft)] px-4 py-3 text-sm text-[var(--red)]">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full bg-[var(--cyan)] px-6 py-3 text-sm font-medium text-slate-950 shadow-[0_10px_30px_rgba(102,227,255,0.28)] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {submitting ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  d="M4 12a8 8 0 018-8"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              Creating…
            </>
          ) : (
            "Create agent"
          )}
        </button>

        {form.name.trim() && (
          <div className="text-sm text-[var(--text-secondary)]">
            <span className="text-white">{form.name.trim()}</span> ·{" "}
            {selectedTemplate.label} · {form.risk} · {form.bankroll} USDC
          </div>
        )}
      </div>
    </form>
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
          style={{
            borderColor: `${agent.color}55`,
            backgroundColor: `${agent.color}14`,
          }}
        >
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Win rate
          </div>
          <div className="mt-2 font-mono text-2xl text-white">
            {agent.winRate}
          </div>
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
