'use client';
// Isolated client-only wrapper for RainbowKit ConnectButton.
// Importing ConnectButton directly calls useConfig (wagmi) at module level,
// which crashes SSR. This file is only ever imported via dynamic({ ssr: false }).
import { ConnectButton } from '@rainbow-me/rainbowkit';
export default function ConnectButtonSafe() {
  return <ConnectButton showBalance={false} chainStatus="icon" />;
}
