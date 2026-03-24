import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  okxWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { xLayer } from 'wagmi/chains';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [okxWallet, metaMaskWallet, coinbaseWallet],
    },
    {
      groupName: 'Other',
      wallets: [rainbowWallet, walletConnectWallet],
    },
  ],
  {
    appName: 'Agent Arena',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '0ca407866485bb159d3a29329ac34ff0',
  }
);

export const config = createConfig({
  connectors,
  chains: [xLayer],
  transports: { [xLayer.id]: http() },
  ssr: true,
});
