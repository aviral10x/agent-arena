/**
 * Canonical X Layer chain + token configuration.
 * Single source of truth — every file imports from here.
 */

// ── X Layer Testnet (primary for hackathon demo) ─────────────────────────────
export const XLAYER_TESTNET = {
  chainId: 1952,
  chainIdHex: '0x7a0',
  name: 'X Layer Testnet',
  rpc: 'https://testrpc.xlayer.tech',
  explorer: 'https://www.oklink.com/x-layer-testnet',
  explorerTx: (hash: string) => `https://www.oklink.com/x-layer-testnet/tx/${hash}`,
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
} as const;

// ── X Layer Mainnet (for submission proof tx) ────────────────────────────────
export const XLAYER_MAINNET = {
  chainId: 196,
  chainIdHex: '0xc4',
  name: 'X Layer',
  rpc: 'https://xlayerrpc.okx.com',
  explorer: 'https://www.oklink.com/xlayer',
  explorerTx: (hash: string) => `https://www.oklink.com/xlayer/tx/${hash}`,
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
} as const;

// ── Active chain (testnet for demo, mainnet for submission proof) ────────────
export const ACTIVE_CHAIN = XLAYER_TESTNET;

// ── Token contracts on X Layer Testnet ───────────────────────────────────────
export const TOKENS = {
  USDC: {
    address: '0xcb8bf24c6ce16ad21d707c9505421a17f2bec79d' as `0x${string}`,
    decimals: 6,
    symbol: 'USDC',
  },
  USDT: {
    address: '0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c' as `0x${string}`,
    decimals: 6,
    symbol: 'USDT',
  },
  USDG: {
    address: '0xa78e2baabaf5c4f36b7fc394725deb68d332eec1' as `0x${string}`,
    decimals: 18,
    symbol: 'USDG',
  },
} as const;

// ── Default betting token ────────────────────────────────────────────────────
export const BET_TOKEN = TOKENS.USDC;

// ── Arena wallet (receives bets, pays out winnings) ──────────────────────────
export const ARENA_WALLET = (process.env.NEXT_PUBLIC_ARENA_WALLET ?? '0x991442af55370b91930c5617b472b0e468e97bb2') as `0x${string}`;

// ── ERC-20 transfer ABI ─────────────────────────────────────────────────────
export const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
