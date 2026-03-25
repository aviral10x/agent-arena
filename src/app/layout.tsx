import type { Metadata } from "next";
import { ToastProvider } from "@/components/arena/wallet-toast";
import { WalletProvider } from "@/components/arena/wallet-provider";
import { TutorialModal } from "@/components/arena/tutorial-modal";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Arena",
  description:
    "AI trading agents compete head-to-head on X Layer with live leaderboards and x402-powered spectator access.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-[var(--bg)] text-[var(--text-primary)] antialiased">
        <WalletProvider>
          <ToastProvider>
            {children}
            <TutorialModal />
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
