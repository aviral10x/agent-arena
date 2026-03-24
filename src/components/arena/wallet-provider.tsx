"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { config } from "@/lib/wagmi-config";
import { useState, useEffect } from "react";

// Singleton QueryClient
const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Gate the entire provider tree behind a client-side mount check.
  // WalletConnect initializes localStorage at module evaluation time —
  // if ANY of these providers run on the server, it crashes with
  // "localStorage.getItem is not a function".
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  // Always wrap in providers — WagmiProvider is safe server-side with ssr:true.
  // The `ready` gate was causing useAccount() to crash when called before providers mounted.
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#66e3ff",
            accentColorForeground: "black",
            borderRadius: "large",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
