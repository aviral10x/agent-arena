"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { useState, useEffect, type ReactNode } from "react";
import { getWagmiConfig } from "@/lib/wagmi-config";

// Singleton QueryClient — stable across re-renders
const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wagmiConfig, setWagmiConfig] = useState<ReturnType<typeof getWagmiConfig> | null>(null);

  useEffect(() => {
    // Instantiate wagmi config only on the client, after mount.
    // This guarantees localStorage is available when WalletConnect initializes.
    setWagmiConfig(getWagmiConfig());
  }, []);

  // Pre-mount: render children without wallet context.
  // Components using useAccount/useConnect handle the null case via isConnected: false.
  if (!wagmiConfig) {
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
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
