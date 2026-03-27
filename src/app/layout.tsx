import type { Metadata } from "next";
import { ToastProvider } from "@/components/arena/wallet-toast";
import { WalletProvider } from "@/hooks/use-wallet";
import { TutorialModal } from "@/components/arena/tutorial-modal";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Arena",
  description:
    "AI badminton athletes compete head-to-head with real physics, archetype tactics, and x402-powered spectator betting.",
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
