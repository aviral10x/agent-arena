/**
 * Chain configuration — controls whether agents trade on testnet or mainnet.
 * Set USE_TESTNET=true in .env to switch to X Layer testnet.
 */
import { defineChain } from 'viem';

export const USE_TESTNET = process.env.USE_TESTNET === 'true' || process.env.NODE_ENV !== 'production';

// X Layer Testnet (chain ID 195)
export const xLayerTestnet = defineChain({
  id: 195,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: {
      name: 'OKLink Testnet',
      url: 'https://www.oklink.com/xlayer-test',
    },
  },
  testnet: true,
});

// X Layer Mainnet (chain ID 196)
export const xLayerMainnet = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: {
      name: 'OKLink',
      url: 'https://www.oklink.com/xlayer',
    },
  },
});

export const activeChain = USE_TESTNET ? xLayerTestnet : xLayerMainnet;
export const activeChainId = USE_TESTNET ? 195 : 196;
export const explorerBase = USE_TESTNET
  ? 'https://www.oklink.com/xlayer-test/tx'
  : 'https://www.oklink.com/xlayer/tx';

export function getTxExplorerUrl(txHash: string): string {
  return `${explorerBase}/${txHash}`;
}

// Testnet token addresses (X Layer testnet chain 195)
export const TESTNET_TOKENS: Record<string, { address: `0x${string}`; decimals: number }> = {
  OKB:  { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  USDC: { address: '0x01b3b8c07614a8A2e4CB56Cc5F5Ae6D97E2a1F4b', decimals: 6  }, // testnet USDC
  WETH: { address: '0x5a77f1443d16ee5761d310e38b62f77f726bc71c', decimals: 18 }, // same on testnet
  WBTC: { address: '0xea034fb02eb1808c2cc3adbc15f447b93cbe08e1', decimals: 8  }, // same on testnet
};
