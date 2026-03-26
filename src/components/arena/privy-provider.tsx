"use client";

import { PrivyProvider } from "@privy-io/react-auth";

// Placeholder app ID for development — replace with real ID in .env
const PLACEHOLDER_APP_ID = "clpispdty00ycl80fpueukbhl";

export function ArenaPrivyProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? PLACEHOLDER_APP_ID;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#00f0ff",
          logo: undefined,
        },
        loginMethods: ["wallet", "email", "google"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
