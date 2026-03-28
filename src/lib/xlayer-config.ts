import { xLayer, xLayerTestnet } from 'wagmi/chains';
import type { Address } from 'viem';

export type XLayerArenaNetwork = 'testnet' | 'mainnet';

type XLayerConfig = {
  key: XLayerArenaNetwork;
  label: string;
  chainId: number;
  chainHex: `0x${string}`;
  rpcUrl: string;
  explorerBaseUrl: string;
  usdcAddress: Address;
  nativeCurrencySymbol: string;
  walletDisplayName: string;
  wagmiChain: typeof xLayer | typeof xLayerTestnet;
};

const TESTNET_RPC_URL =
  process.env.XLAYER_TESTNET_RPC_URL?.trim() ||
  process.env.XLAYER_RPC_URL?.trim() ||
  'https://testrpc.xlayer.tech';

const MAINNET_RPC_URL =
  process.env.XLAYER_MAINNET_RPC_URL?.trim() ||
  'https://rpc.xlayer.tech';

export const ARENA_WALLET_ADDRESS = (
  process.env.ARENA_WALLET_ADDRESS?.trim() ||
  process.env.NEXT_PUBLIC_ARENA_WALLET?.trim() ||
  '0x991442af55370b91930c5617b472b0e468e97bb2'
) as Address;

export const XLAYER_TESTNET_CONFIG: XLayerConfig = {
  key: 'testnet',
  label: 'X Layer Testnet',
  chainId: xLayerTestnet.id,
  chainHex: `0x${xLayerTestnet.id.toString(16)}`,
  rpcUrl: TESTNET_RPC_URL,
  explorerBaseUrl: 'https://www.okx.com/web3/explorer/xlayer-test',
  usdcAddress: (process.env.XLAYER_TESTNET_USDC_ADDRESS?.trim() ||
    '0xcb8bf24c6ce16ad21d707c9505421a17f2bec79d') as Address,
  nativeCurrencySymbol: xLayerTestnet.nativeCurrency.symbol,
  walletDisplayName: 'X Layer Testnet',
  wagmiChain: xLayerTestnet,
};

export const XLAYER_MAINNET_CONFIG: XLayerConfig = {
  key: 'mainnet',
  label: 'X Layer',
  chainId: xLayer.id,
  chainHex: `0x${xLayer.id.toString(16)}`,
  rpcUrl: MAINNET_RPC_URL,
  explorerBaseUrl: 'https://www.okx.com/web3/explorer/xlayer',
  usdcAddress: (process.env.XLAYER_MAINNET_USDC_ADDRESS?.trim() ||
    process.env.USDC_CONTRACT_ADDRESS?.trim() ||
    '0x74b7f16337b8972027f6196a17a631ac6de26d22') as Address,
  nativeCurrencySymbol: xLayer.nativeCurrency.symbol,
  walletDisplayName: 'X Layer',
  wagmiChain: xLayer,
};

export const BETTING_NETWORK = XLAYER_TESTNET_CONFIG;
export const AGENTIC_X402_NETWORK = XLAYER_MAINNET_CONFIG;

export function getXLayerConfig(network: XLayerArenaNetwork = 'testnet'): XLayerConfig {
  return network === 'mainnet' ? XLAYER_MAINNET_CONFIG : XLAYER_TESTNET_CONFIG;
}

export function getXLayerExplorerTxUrl(
  txHash: string,
  network: XLayerArenaNetwork = 'testnet',
): string {
  const config = getXLayerConfig(network);
  return `${config.explorerBaseUrl}/tx/${txHash}`;
}

export function usdcToBaseUnits(amountUsdc: number): bigint {
  return BigInt(Math.round(amountUsdc * 1_000_000));
}

export function usdcFromBaseUnits(amount: bigint): number {
  return Number(amount) / 1_000_000;
}

export function parseDisplayedUsdc(raw: string | null | undefined): number {
  if (!raw) return 0;
  const match = raw.match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : 0;
}

