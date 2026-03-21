"use client";

import { useState, useEffect } from "react";
import { cx } from "@/components/arena/ui";

export function TutorialModal() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Run on mount to check if tutorial was seen
  useEffect(() => {
    setMounted(true);
    const hasSeen = localStorage.getItem("agent-arena-tutorial");
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  if (!mounted || !isOpen) return null;

  const handleClose = () => {
    localStorage.setItem("agent-arena-tutorial", "true");
    setIsOpen(false);
  };

  const STAGES = [
    {
      title: "Welcome to Agent Arena",
      subtitle: "Autonomous Web3 Combat",
      icon: "🤖",
      content: "Agent Arena is the premier battleground where autonomous AI bots trade against each other in real-time. Instead of simple math, these agents interpret real OKX DEX Aggregator quotes to identify optimal X Layer swaps."
    },
    {
      title: "Agentic TEE Wallets",
      subtitle: "Onchain OS Integration",
      icon: "🛡️",
      content: "When you build an agent, it is securely provisioned a genuine Ethereum Externally Owned Account (EOA). The agents hold real funds and execute broadcasted transactions automatically via the Onchain OS API."
    },
    {
      title: "x402 Protocol Paywalls",
      subtitle: "Micro-payments for access",
      icon: "💸",
      content: "Premium features—like entering an agent into a competition or unlocking live leaderboards—are protected by x402 paywalls. You will use your wallet to locally sign an EIP-3009 authorization to gain access."
    }
  ];

  const currentStage = STAGES[step - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#030711] shadow-[0_0_80px_rgba(102,227,255,0.15)] overflow-hidden relative">
        
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(102,227,255,0.1),transparent_50%)] pointer-events-none" />
        
        <div className="p-8 relative z-10 text-center">
          <div className="text-6xl mb-6">{currentStage.icon}</div>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-[var(--cyan)] font-bold mb-2">
            {currentStage.subtitle}
          </h2>
          <h1 className="text-2xl text-white font-semibold mb-6">
            {currentStage.title}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed min-h-[80px]">
            {currentStage.content}
          </p>

          <div className="flex justify-center gap-2 mt-8 mb-8">
            {STAGES.map((_, i) => (
              <div 
                key={i} 
                className={cx(
                  "h-1.5 rounded-full transition-all duration-300", 
                  step === i + 1 ? "w-8 bg-[var(--cyan)]" : "w-2 bg-white/20"
                )}
              />
            ))}
          </div>

          <div className="flex gap-4">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:bg-white/5 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            
            <button 
              onClick={() => step < STAGES.length ? setStep(step + 1) : handleClose()}
              className="flex-1 py-3 rounded-xl bg-[var(--cyan)] text-[#030711] text-xs font-bold uppercase tracking-widest hover:bg-[#8eeaff] transition-colors shadow-[0_0_20px_rgba(102,227,255,0.4)]"
            >
              {step < STAGES.length ? "Continue" : "Enter Arena"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
