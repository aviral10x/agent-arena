/**
 * DeFi Protocol Integrations — X Layer (chain 196)
 *
 * Verified live contracts (as of March 2026):
 *
 * DEX (via OKX DEX Aggregator — routes through these):
 *   iZUMi Finance    0x02F55D53DcE23B4AA962CC68b0f685f26143Bdb2
 *   OkieSwap         0x1e4a5963abfd975d8c9021ce480b42188849d41d
 *   RevoSwap V2      0xe538905cf8410324e03a5a23c1c177a474d59b2b
 *
 * Lending:
 *   Aave V3 Pool     0xE3F3Caefdd7180F884c01E57f65Df979Af84f116  (deployed, reserves pending)
 *   Dolomite         0x6Bd780E7fDf01D77e4d475c821f1e7AE05409072  (announced, verify live)
 *
 * NOT on X Layer (yet): Uniswap V3, Curve, Compound
 */

import crypto from 'crypto';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseUnits,
  formatUnits,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { xLayer } from 'wagmi/chains';
import { decryptPrivateKey } from './okx-swap';

const RPC = process.env.XLAYER_RPC_URL ?? 'https://rpc.xlayer.tech';
const publicClient = createPublicClient({ chain: xLayer, transport: http(RPC) });

// ── Token addresses ────────────────────────────────────────────────────────────
export const XLAYER_TOKENS: Record<string, { address: Address; decimals: number; symbol: string }> = {
  OKB:  { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, symbol: 'OKB'  },
  USDC: { address: '0x74b7f16337b8972027f6196a17a631ac6de26d22', decimals: 6,  symbol: 'USDC' },
  WETH: { address: '0x5a77f1443d16ee5761d310e38b62f77f726bc71c', decimals: 18, symbol: 'WETH' },
  WBTC: { address: '0xea034fb02eb1808c2cc3adbc15f447b93cbe08e1', decimals: 8,  symbol: 'WBTC' },
};

// ── Protocol registry ──────────────────────────────────────────────────────────
export const PROTOCOLS = {
  // DEX
  IZUMI:    { address: '0x02F55D53DcE23B4AA962CC68b0f685f26143Bdb2' as Address, name: 'iZUMi Finance', type: 'dex'     },
  OKIESWAP: { address: '0x1e4a5963abfd975d8c9021ce480b42188849d41d' as Address, name: 'OkieSwap',      type: 'dex'     },
  REVOSWAP: { address: '0xe538905cf8410324e03a5a23c1c177a474d59b2b' as Address, name: 'RevoSwap V2',   type: 'dex'     },
  // Lending
  AAVE_V3:  { address: '0xE3F3Caefdd7180F884c01E57f65Df979Af84f116' as Address, name: 'Aave V3',       type: 'lending' },
} as const;

// ── ABIs ───────────────────────────────────────────────────────────────────────
const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]);

const AAVE_POOL_ABI = parseAbi([
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
  'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)',
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
  'function getReservesList() view returns (address[])',
  // getReserveData omitted — complex tuple not needed for current tools
]);

const IZUMI_ABI = parseAbi([
  'function swapAmount(uint128 amount, bytes calldata path, address recipient, uint256 minAcquired, uint256 deadline) payable returns (uint256 cost, uint256 acquire)',
  'function swapDesire(uint128 desire, bytes calldata path, address recipient, uint256 maxPayed, uint256 deadline) payable returns (uint256 cost, uint256 acquire)',
]);

// ── Helpers ────────────────────────────────────────────────────────────────────
function walletClientFor(privateKey: string) {
  const account = privateKeyToAccount(decryptPrivateKey(privateKey));
  return {
    client: createWalletClient({ account, chain: xLayer, transport: http(RPC) }),
    account,
  };
}

async function ensureApproval(
  tokenAddr: Address,
  spender: Address,
  amount: bigint,
  walletClient: ReturnType<typeof walletClientFor>
) {
  const { client, account } = walletClient;
  const existing = await publicClient.readContract({
    address: tokenAddr, abi: ERC20_ABI, functionName: 'allowance',
    args: [account.address, spender],
  });
  if (existing < amount) {
    const tx = await client.writeContract({
      address: tokenAddr, abi: ERC20_ABI, functionName: 'approve',
      args: [spender, amount * BigInt(10)],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`[defi] Approved ${tokenAddr} for ${spender}: ${tx}`);
  }
}

// ── Token balance ──────────────────────────────────────────────────────────────
export async function getTokenBalance(wallet: Address, symbol: string): Promise<number> {
  const token = XLAYER_TOKENS[symbol];
  if (!token) return 0;
  if (token.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
    const bal = await publicClient.getBalance({ address: wallet });
    return parseFloat(formatUnits(bal, 18));
  }
  const bal = await publicClient.readContract({
    address: token.address, abi: ERC20_ABI, functionName: 'balanceOf', args: [wallet],
  });
  return parseFloat(formatUnits(bal, token.decimals));
}

export async function getAllBalances(wallet: Address): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  await Promise.all(
    Object.entries(XLAYER_TOKENS).map(async ([sym]) => {
      results[sym] = await getTokenBalance(wallet, sym).catch(() => 0);
    })
  );
  return results;
}

// ── Aave V3 ────────────────────────────────────────────────────────────────────
export interface AavePosition {
  totalCollateralUsd: number;
  totalDebtUsd:       number;
  availableBorrowUsd: number;
  healthFactor:       number;
  ltv:                number;
  reserves:           string[];
}

export async function getAavePosition(wallet: Address): Promise<AavePosition> {
  const POOL = PROTOCOLS.AAVE_V3.address;
  const accountData = await publicClient.readContract({
    address: POOL, abi: AAVE_POOL_ABI, functionName: 'getUserAccountData', args: [wallet],
  }) as [bigint, bigint, bigint, bigint, bigint, bigint];
  const [col, debt, avail, , ltv, hf] = accountData;
  const reserves = await publicClient.readContract({
    address: POOL, abi: AAVE_POOL_ABI, functionName: 'getReservesList',
  }).catch(() => [] as Address[]);

  return {
    totalCollateralUsd: parseFloat(formatUnits(col, 8)),
    totalDebtUsd:       parseFloat(formatUnits(debt, 8)),
    availableBorrowUsd: parseFloat(formatUnits(avail, 8)),
    healthFactor:       parseFloat(formatUnits(hf, 18)),
    ltv:                Number(ltv) / 10000,
    reserves:           reserves as string[],
  };
}

export async function aaveSupply(
  asset:      string,
  amountUsd:  number,
  privateKey: string,
  dryRun = false
): Promise<{ txHash?: Hash; success: boolean; error?: string }> {
  const token = XLAYER_TOKENS[asset];
  if (!token) return { success: false, error: `Unknown asset: ${asset}` };

  const POOL   = PROTOCOLS.AAVE_V3.address;
  const amount = parseUnits(amountUsd.toString(), token.decimals);
  const wc     = walletClientFor(privateKey);

  if (dryRun) {
    console.log(`[aave:dry] supply ${asset} $${amountUsd}`);
    return { success: true };
  }

  try {
    if (token.address !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
      await ensureApproval(token.address, POOL, amount, wc);
    }
    const tx = await wc.client.writeContract({
      address: POOL, abi: AAVE_POOL_ABI, functionName: 'supply',
      args: [token.address, amount, wc.account.address, 0],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`[aave] Supplied ${asset} $${amountUsd}: ${tx}`);
    return { success: true, txHash: tx };
  } catch (e: any) {
    return { success: false, error: e.message?.slice(0, 200) };
  }
}

export async function aaveWithdraw(
  asset:      string,
  amountUsd:  number,
  privateKey: string,
  dryRun = false
): Promise<{ txHash?: Hash; success: boolean; amountOut?: number; error?: string }> {
  const token = XLAYER_TOKENS[asset];
  if (!token) return { success: false, error: `Unknown asset: ${asset}` };

  const POOL   = PROTOCOLS.AAVE_V3.address;
  const amount = parseUnits(amountUsd.toString(), token.decimals);
  const wc     = walletClientFor(privateKey);

  if (dryRun) return { success: true, amountOut: amountUsd };

  try {
    const tx = await wc.client.writeContract({
      address: POOL, abi: AAVE_POOL_ABI, functionName: 'withdraw',
      args: [token.address, amount, wc.account.address],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`[aave] Withdrew ${asset} $${amountUsd}: ${tx}`);
    return { success: true, txHash: tx, amountOut: amountUsd };
  } catch (e: any) {
    return { success: false, error: e.message?.slice(0, 200) };
  }
}

export async function aaveBorrow(
  asset:      string,
  amountUsd:  number,
  privateKey: string,
  dryRun = false
): Promise<{ txHash?: Hash; success: boolean; error?: string }> {
  const token = XLAYER_TOKENS[asset];
  if (!token) return { success: false, error: `Unknown asset: ${asset}` };

  const POOL   = PROTOCOLS.AAVE_V3.address;
  const amount = parseUnits(amountUsd.toString(), token.decimals);
  const wc     = walletClientFor(privateKey);

  if (dryRun) return { success: true };

  try {
    const tx = await wc.client.writeContract({
      address: POOL, abi: AAVE_POOL_ABI, functionName: 'borrow',
      args: [token.address, amount, BigInt(2), 0, wc.account.address], // mode 2 = variable rate
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`[aave] Borrowed ${asset} $${amountUsd}: ${tx}`);
    return { success: true, txHash: tx };
  } catch (e: any) {
    return { success: false, error: e.message?.slice(0, 200) };
  }
}

// ── Protocol health check ──────────────────────────────────────────────────────
export async function getProtocolStatus(): Promise<Record<string, { live: boolean; bytecodeSize: number }>> {
  const results: Record<string, { live: boolean; bytecodeSize: number }> = {};
  await Promise.all(
    Object.entries(PROTOCOLS).map(async ([key, proto]) => {
      const code = await publicClient.getBytecode({ address: proto.address }).catch(() => null);
      results[key] = { live: (code?.length ?? 0) > 4, bytecodeSize: code?.length ?? 0 };
    })
  );
  return results;
}
