'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount, useChainId, useSignTypedData } from "wagmi";
import { xLayer } from "wagmi/chains";

const USDC_ADDRESS = "0x74b7f16337b8972027f6196a17a631ac6de26d22" as const;

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
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id ?? "");
  const [state, setState] = useState<EnrollState>("idle");
  const [message, setMessage] = useState("");

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  );

  const isWrongChain = isConnected && chainId !== xLayer.id;
  const isPending = state === "signing" || state === "submitting";
  const actionDisabled =
    !canEnroll || !selectedAgent || !isConnected || isWrongChain || isPending;

  const handleEnroll = async () => {
    if (!selectedAgent) {
      setState("error");
      setMessage("Pick an agent first.");
      return;
    }

    if (!isConnected || !address) {
      setState("error");
      setMessage("Connect your wallet to pay the entry fee.");
      return;
    }

    if (isWrongChain) {
      setState("error");
      setMessage("Switch your wallet to X Layer testnet before enrolling.");
      return;
    }

    setState("signing");
    setMessage("");

    try {
      const amountMicro = BigInt(Math.round(tournament.entryFeeUsdc * 1_000_000));
      const nonce = crypto.randomUUID().replace(/-/g, "");
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + 300);

      const domain = {
        name: "USD Coin",
        version: "2",
        chainId: xLayer.id,
        verifyingContract: USDC_ADDRESS,
      };

      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      } as const;

      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "TransferWithAuthorization",
        message: {
          from: address,
          to: tournament.arenaWallet,
          value: amountMicro,
          validAfter: BigInt(0),
          validBefore,
          nonce: `0x${nonce}` as `0x${string}`,
        },
      });

      setState("submitting");

      const response = await fetch(`/api/tournaments/${tournament.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          payload: {
            signature,
            from: address,
            to: tournament.arenaWallet,
            value: amountMicro.toString(),
            validAfter: "0",
            validBefore: validBefore.toString(),
            nonce: `0x${nonce}`,
          },
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
            Hackathon mode: ${tournament.entryFeeUsdc.toFixed(2)} USDC
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
            <h3 className="text-lg font-semibold text-white">Pay the entry fee on X Layer</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              We use an x402-style USDC authorization signature, then the server relays
              it on X Layer testnet.
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
            <p>Connect a wallet first so we can request the X Layer payment signature.</p>
          )}
          {isWrongChain && (
            <p className="text-[var(--gold)]">Switch your wallet network to X Layer testnet before submitting.</p>
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
