"use client";

import { useState } from "react";
import { cx } from "@/components/arena/ui";

type TweakModalProps = {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  agentColor: string;
  currentArchetype: string;
};

export function TweakModal({
  isOpen,
  onClose,
  agentId,
  agentName,
  agentColor,
  currentArchetype,
}: TweakModalProps) {
  const [strategy, setStrategy] = useState(currentArchetype || "Momentum");
  const [risk, setRisk] = useState("Balanced");
  const [isDeploying, setIsDeploying] = useState(false);

  if (!isOpen) return null;

  const handleDeploy = () => {
    setIsDeploying(true);
    // Simulate Onchain OS / x402 hot-reload parameter injection
    setTimeout(() => {
      setIsDeploying(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[rgba(6,10,20,0.95)] p-6 shadow-2xl overflow-hidden glass-panel relative"
        style={{ boxShadow: `0 20px 80px -20px ${agentColor}40` }}
      >
        {/* Glow effect matching the agent */}
        <div 
          className="absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-20 pointer-events-none" 
          style={{ backgroundColor: agentColor }} 
        />

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h2 className="text-sm uppercase tracking-[0.25em] text-[var(--text-muted)]">Live Overrides</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: agentColor }} />
              <h1 className="text-xl font-bold text-white tracking-widest uppercase">{agentName}</h1>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 relative z-10 text-white">
          <div>
            <label className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] block mb-3">
              Strategy Inject (LLM Core)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["Momentum", "Mean Reversion", "Whale Follower", "Diversified"].map((t) => (
                <button
                  key={t}
                  onClick={() => setStrategy(t)}
                  className={cx(
                    "px-3 py-2 text-xs uppercase tracking-wider rounded-xl border transition-all text-left",
                    strategy === t 
                      ? "bg-white/10 border-[var(--cyan)] text-white shadow-[0_0_15px_rgba(102,227,255,0.15)]" 
                      : "bg-white/5 border-white/5 text-[var(--text-secondary)] hover:bg-white/10"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] flex justify-between mb-3">
              <span>Risk Matrix</span>
              <span className="text-[var(--gold)]">{risk}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Conservative", "Balanced", "Aggressive"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={cx(
                    "px-2 py-2 text-[10px] sm:text-xs uppercase tracking-wider rounded-xl border transition-all text-center",
                    risk === r
                      ? "bg-white/10 border-[var(--gold)] text-[var(--gold)]" 
                      : "bg-[rgba(255,255,255,0.03)] border-white/5 text-[var(--text-muted)] hover:text-white"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="mt-8 w-full py-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-[0.25em] transition-all relative overflow-hidden group border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] disabled:opacity-50"
            style={{ 
              backgroundColor: isDeploying ? 'rgba(255,255,255,0.05)' : `${agentColor}22`,
              color: isDeploying ? 'var(--text-muted)' : agentColor
            }}
          >
            {isDeploying ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Deploying x402 Signature...
              </span>
            ) : "Hot Reload Parameters"}
          </button>
        </div>
      </div>
    </div>
  );
}
