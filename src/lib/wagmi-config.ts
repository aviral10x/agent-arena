import { createConfig, http } from 'wagmi';
import { xLayerTestnet as xLayer } from 'wagmi/chains';

// Lazy singleton — created only on client, never on server.
// This prevents WalletConnect from calling localStorage during SSR.
let _config: ReturnType<typeof createConfig> | null = null;

export function getWagmiConfig() {
  if (typeof window === 'undefined') {
    // Server: return a minimal stub config (providers won't be used)
    return createConfig({
      chains: [xLayer],
      transports: { [xLayer.id]: http() },
      ssr: true,
    });
  }

  if (!_config) {
    // Client-only: import connectors lazily so localStorage is available
    const {
      connectorsForWallets,
    } = require('@rainbow-me/rainbowkit');
    const {
      okxWallet,
      metaMaskWallet,
      coinbaseWallet,
      rainbowWallet,
      walletConnectWallet,
    } = require('@rainbow-me/rainbowkit/wallets');

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
        projectId:
          process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
          '0ca407866485bb159d3a29329ac34ff0',
      }
    );

    _config = createConfig({
      connectors,
      chains: [xLayer],
      transports: { [xLayer.id]: http() },
      ssr: false, // client-only from here
    });
  }

  return _config;
}

// For backwards compat — components that imported `config` directly
export const config = typeof window !== 'undefined' ? getWagmiConfig() : createConfig({
  chains: [xLayer],
  transports: { [xLayer.id]: http() },
  ssr: true,
});
