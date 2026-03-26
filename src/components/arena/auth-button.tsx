"use client";

import { usePrivy } from "@privy-io/react-auth";

export function AuthButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return (
      <div className="border border-[#464752]/30 px-3 py-1 text-[10px] font-mono uppercase text-[#464752]">
        ...
      </div>
    );
  }

  if (authenticated && user) {
    const wallet = user.wallet?.address;
    const display = wallet
      ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}`
      : user.email?.address?.split("@")[0] ?? "Player";

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 border border-[#00f0ff]/20 bg-[#00f0ff]/05 px-2 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" />
          <span className="text-[10px] font-mono text-[#00f0ff] uppercase">{display}</span>
        </div>
        <button
          onClick={logout}
          className="text-[10px] font-mono uppercase text-[#464752] hover:text-[#aaaab6] transition-colors"
        >
          Exit
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="border border-[#00f0ff]/30 px-3 py-1 text-[10px] font-mono uppercase text-[#00f0ff] hover:bg-[#00f0ff]/10 transition-colors"
    >
      Login_→
    </button>
  );
}
