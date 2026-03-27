'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";

type AgentOption = {
  id: string;
  name: string;
  archetype: string;
  color: string;
  bio: string;
  risk: string;
  winRate: string;
};

type TournamentSummary = {
  id: string;
  title: string;
  entryFeeUsdc: number;
  arenaWallet: `0x${string}`;
};

type EnrollState = "idle" | "signing" | "submitting" | "success" | "error";

const STATE_LABELS: Record<Exclude<EnrollState, "idle" | "success">, string> = {
  signing: "Sign payment in wallet…",
  submitting: "Submitting enrollment…",
  error: "Retry enrollment",
};

export function TournamentEnrollClient({
  tournament,
  agents,
  canEnroll,
  disabledReason,
}: {
  tournament: TournamentSummary;
  agents: AgentOption[];
  canEnroll: boolean;
  disabledReason?: string;
}) {
  const { address, connected: isConnected, connect, signX402Payment } = useWallet();
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id ?? "");
  const [state, setState] = useState<EnrollState>("idle");
  const [message, setMessage] = useState("");

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  );

  const isPending = state === "signing" || state === "submitting";
  const actionDisabled =
    !canEnroll || !selectedAgent || !isConnected || isPending;

  const handleEnroll = async () => {
    if (!selectedAgent) {
      setState("error");
      setMessage("Pick an agent first.");
      return;
    }

    if (!isConnected || !address) {
      connect();
      return;
    }

    setState("signing");
    setMessage("");

    try {
      // Sign x402 USDC payment via wallet
      const payload = await signX402Payment(tournament.entryFeeUsdc);

      if (!payload) {
        // User rejected or signing failed — fall back to demo mode
        const demoPayload = {
          txSignature: `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          walletAddress: address,
        };

        setState("submitting");

        const response = await fetch(`/api/tournaments/${tournament.id}/enroll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: selectedAgent.id,
            payload: demoPayload,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Enrollment failed");

        setState("success");
        setMessage(`${selectedAgent.name} is locked into ${tournament.title}.`);
        return;
      }

      setState("submitting");

      const response = await fetch(`/api/tournaments/${tournament.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          payload,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Enrollment failed");
      }

      setState("success");
      setMessage(`${selectedAgent.name} is locked into ${tournament.title}.`);
    } catch (error: any) {
      setState("error");
      setMessage(error?.message ?? "Enrollment failed");
    }
  };

  if (state === "success" && selectedAgent) {
    return (
      <div className="rounded-[1.5rem] border border-[var(--green)]/20 bg-[var(--green)]/8 p-5 sm:p-6">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--green)]">
          Enrollment confirmed
        </div>
        <h3 className="mt-3 text-xl font-semibold text-white">
          {selectedAgent.name} is in.
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {message} Once the bracket fills, the tournament spins up automatically and
          the live arena becomes watchable from the main tournaments view.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/tournaments"
            className="inline-flex items-center justify-center rounded-full bg-[var(--teal)] px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Back to tournaments
          </Link>
          <Link
            href="/challenges"
            className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Watch the arena
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Select your entrant
            </div>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Choose the agent you want to enter
            </h3>
          </div>
          <div className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            Entry fee: ${tournament.entryFeeUsdc.toFixed(2)} USDC
          </div>
        </div>

        {agents.length === 0 ? (
          <div className="mt-4 rounded-[1.2rem] border border-dashed border-white/10 px-4 py-5 text-sm text-[var(--text-secondary)]">
            No available agents yet. Build a fresh agent before you try to enroll.
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {agents.map((agent) => {
              const isSelected = agent.id === selectedAgentId;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`rounded-[1.2rem] border p-4 text-left transition ${
                    isSelected
                      ? "border-[var(--teal)]/40 bg-[var(--teal)]/8"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: agent.color }}
                        />
                        <span className="truncate text-sm font-semibold text-white">
                          {agent.name}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {agent.archetype} · {agent.risk}
                      </div>
                    </div>
                    <div className="text-right text-xs text-[var(--text-muted)]">
                      Win rate
                      <div className="mt-1 font-mono text-sm text-white">{agent.winRate}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    {agent.bio || "Fresh entrant ready for the bracket."}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(11,14,23,0.92)] p-5 sm:p-6">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Payment and submit
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Pay the entry fee</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              x402 USDC payment signed via your connected wallet.
            </p>
          </div>
          <div className="rounded-[1rem] border border-[var(--teal)]/20 bg-[var(--teal)]/10 px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Entry fee
            </div>
            <div className="mt-1 text-2xl font-black text-[var(--teal)]">
              ${tournament.entryFeeUsdc.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
          {!isConnected && (
            <p>
              <button onClick={connect} className="text-[var(--teal)] underline hover:no-underline">
                Connect your wallet
              </button>{" "}
              to pay the entry fee.
            </p>
          )}
          {disabledReason && (
            <p>{disabledReason}</p>
          )}
          {message && state === "error" && (
            <p className="text-[var(--red)]">{message}</p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleEnroll}
            disabled={actionDisabled}
            className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              actionDisabled
                ? "cursor-not-allowed bg-white/10 text-[var(--text-muted)]"
                : "bg-[var(--teal)] text-black hover:opacity-90"
            }`}
          >
            {isPending ? STATE_LABELS[state] : `Pay & enroll ${selectedAgent?.name ?? "agent"}`}
          </button>
          <Link
            href="/agents/create"
            className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Build another agent
          </Link>
        </div>
      </div>
    </div>
  );
}
