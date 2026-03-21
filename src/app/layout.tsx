import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { ToastProvider } from "@/components/arena/wallet-toast";
import { WalletProvider } from "@/components/arena/wallet-provider";
import "./globals.css";

const displayFont = Space_Grotesk({
  variable: "--font-display-family",
  subsets: ["latin"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

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
    <html
      lang="en"
      className={`${displayFont.variable} ${monoFont.variable} dark h-full`}
    >
      <body className="min-h-full bg-[var(--bg)] text-[var(--text-primary)] antialiased">
        <WalletProvider>
          <ToastProvider>{children}</ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
