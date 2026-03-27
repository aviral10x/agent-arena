"use client";

import { useWallet } from "@/hooks/use-wallet";

export function AuthButton() {
  const { ready, connected, address, connect, disconnect } = useWallet();

  if (!ready) {
    return (
      <div className="border border-[#464752]/30 px-3 py-1 text-[10px] font-mono uppercase text-[#464752]">
        ...
      </div>
    );
  }

  if (connected && address) {
    const display = `${address.slice(0, 4)}…${address.slice(-4)}`;

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 border border-[#8ff5ff]/20 bg-[#8ff5ff]/05 px-2 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8ff5ff]" />
          <span className="text-[10px] font-mono text-[#8ff5ff] uppercase">{display}</span>
        </div>
        <button
          onClick={disconnect}
          className="text-[10px] font-mono uppercase text-[#464752] hover:text-[#aaaab6] transition-colors"
        >
          Exit
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="border border-[#8ff5ff]/30 px-3 py-1 text-[10px] font-mono uppercase text-[#8ff5ff] hover:bg-[#8ff5ff]/10 transition-colors"
    >
      Connect Wallet
    </button>
  );
}
