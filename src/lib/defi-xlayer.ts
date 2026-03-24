/**
 * DeFi Protocol Integrations — X Layer (chain 196)
 *
 * Verified on-chain (March 2026):
 *
 * ── Tokens ────────────────────────────────────────────────────────────────────
 *   OKB  (native)   0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
 *   WOKB             0xe538905cf8410324e03a5a23c1c177a474d59b2b  (Wrapped OKB)
 *   USDC             0x74b7f16337b8972027f6196a17a631ac6de26d22
 *   USDT             0x1e4a5963abfd975d8c9021ce480b42188849d41d
 *   WETH             0x5a77f1443d16ee5761d310e38b62f77f726bc71c
 *   WBTC             0xea034fb02eb1808c2cc3adbc15f447b93cbe08e1
 *
 * ── DEX ───────────────────────────────────────────────────────────────────────
 *   OKX DEX Aggregator (API)  — routes through iZUMi on X Layer
 *   iZUMi Swap                0x02F55D53DcE23B4AA962CC68b0f685f26143Bdb2  (45KB)
 *   iZUMi Quoter              0x33531bDBFE34fa6Fd5963D0423f7699775AacaaF  (19KB)
 *   iZUMi LiquidityManager    0xd7de110Bd452AAB96608ac3750c3730A17993DE0  (21KB)
 *
 * ── Lending ───────────────────────────────────────────────────────────────────
 *   Aave V3 Pool              0xE3F3Caefdd7180F884c01E57f65Df979Af84f116  (deployed, 0 reserves)
 *   Aave V3 Data Provider     0x6C505C31714f14e8af2A03633EB2Cdfb4959138F
 *
 * ── NOT on X Layer ────────────────────────────────────────────────────────────
 *   Uniswap V3 (standard address has 0 bytecode)
 *   Curve, Compound, Balancer
 */

import crypto from 'crypto';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseUnits,
  formatUnits,
  encodePacked,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { xLayer } from 'wagmi/chains';
import { decryptPrivateKey } from './okx-swap';

const RPC = process.env.XLAYER_RPC_URL ?? 'https://rpc.xlayer.tech';
export const publicClient = createPublicClient({ chain: xLayer, transport: http(RPC) });

// ── Token registry (all verified on-chain) ────────────────────────────────────
export const XLAYER_TOKENS: Record<string, { address: Address; decimals: number; symbol: string; name: string }> = {
  OKB:  { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, symbol: 'OKB',  name: 'OKB (native)' },
  WOKB: { address: '0xe538905cf8410324e03a5a23c1c177a474d59b2b', decimals: 18, symbol: 'WOKB', name: 'Wrapped OKB' },
  USDC: { address: '0x74b7f16337b8972027f6196a17a631ac6de26d22', decimals: 6,  symbol: 'USDC', name: 'USD Coin' },
  USDT: { address: '0x1e4a5963abfd975d8c9021ce480b42188849d41d', decimals: 6,  symbol: 'USDT', name: 'Tether USD' },
  WETH: { address: '0x5a77f1443d16ee5761d310e38b62f77f726bc71c', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  WBTC: { address: '0xea034fb02eb1808c2cc3adbc15f447b93cbe08e1', decimals: 8,  symbol: 'WBTC', name: 'Wrapped BTC' },
};

// ── Protocol registry (all verified on-chain) ─────────────────────────────────
export const PROTOCOLS = {
  OKX_DEX_AGG: {
    address: '0x0000000000000000000000000000000000000000' as Address, // API-only
    name: 'OKX DEX Aggregator',
    type: 'dex' as const,
    note: 'Routes through iZUMi via OKX API. Use execute_swap tool.',
  },
  IZUMI_SWAP: {
    address: '0x02F55D53DcE23B4AA962CC68b0f685f26143Bdb2' as Address,
    name: 'iZUMi Finance — Swap',
    type: 'dex' as const,
    note: 'Primary DEX on X Layer. Concentrated liquidity.',
  },
  IZUMI_QUOTER: {
    address: '0x33531bDBFE34fa6Fd5963D0423f7699775AacaaF' as Address,
    name: 'iZUMi Finance — Quoter',
    type: 'dex' as const,
    note: 'Read-only swap quotes directly on-chain.',
  },
  IZUMI_LIQUIDITY: {
    address: '0xd7de110Bd452AAB96608ac3750c3730A17993DE0' as Address,
    name: 'iZUMi Finance — Liquidity Manager',
    type: 'dex' as const,
    note: 'Add/remove concentrated liquidity positions.',
  },
  AAVE_V3: {
    address: '0xE3F3Caefdd7180F884c01E57f65Df979Af84f116' as Address,
    name: 'Aave V3',
    type: 'lending' as const,
    note: 'Deployed. 0 reserves currently — ecosystem bootstrapping.',
  },
} as const;

// ── ABIs ───────────────────────────────────────────────────────────────────────
const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);

const AAVE_POOL_ABI = parseAbi([
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
  'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)',
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
  'function getReservesList() view returns (address[])',
]);

// iZUMi Quoter ABI
const IZUMI_QUOTER_ABI = parseAbi([
  'function quoteExactInput(bytes memory path, uint256 amountIn) view returns (uint256 amountOut, int24[] memory pointAfterList)',
  'function quoteExactOutput(bytes memory path, uint256 desireOut) view returns (uint256 amountIn, int24[] memory pointAfterList)',
]);

// iZUMi Swap ABI — using full ABI object (parseAbi doesn't handle struct params)
const IZUMI_SWAP_ABI = [{
  name: 'swapAmount',
  type: 'function',
  stateMutability: 'payable',
  inputs: [{
    name: 'params',
    type: 'tuple',
    components: [
      { name: 'path',        type: 'bytes'   },
      { name: 'recipient',   type: 'address' },
      { name: 'amount',      type: 'uint128' },
      { name: 'minAcquired', type: 'uint256' },
      { name: 'deadline',    type: 'uint256' },
    ],
  }],
  outputs: [{ name: 'cost', type: 'uint256' }, { name: 'acquire', type: 'uint256' }],
}] as const;

// ── OKX API auth ───────────────────────────────────────────────────────────────
function getOKXHeaders(path: string) {
  const apiKey = process.env.OKX_API_KEY!;
  const secretKey = process.env.OKX_SECRET_KEY!;
  const passphrase = process.env.OKX_PASSPHRASE!;
  const ts = new Date().toISOString();
  const sign = crypto.createHmac('sha256', secretKey).update(ts + 'GET' + path).digest('base64');
  return { 'OK-ACCESS-KEY': apiKey, 'OK-ACCESS-SIGN': sign, 'OK-ACCESS-TIMESTAMP': ts, 'OK-ACCESS-PASSPHRASE': passphrase };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function walletClientFor(privateKey: string) {
  const account = privateKeyToAccount(decryptPrivateKey(privateKey));
  return { client: createWalletClient({ account, chain: xLayer, transport: http(RPC) }), account };
}

async function ensureApproval(tokenAddr: Address, spender: Address, amount: bigint, wc: ReturnType<typeof walletClientFor>) {
  if (tokenAddr === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') return; // native OKB
  const existing = await publicClient.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: 'allowance', args: [wc.account.address, spender] });
  if (existing < amount) {
    const tx = await wc.client.writeContract({ address: tokenAddr, abi: ERC20_ABI, functionName: 'approve', args: [spender, amount * BigInt(10)] });
    await publicClient.waitForTransactionReceipt({ hash: tx });
  }
}

// ── Token balances ─────────────────────────────────────────────────────────────
export async function getTokenBalance(wallet: Address, symbol: string): Promise<number> {
  const token = XLAYER_TOKENS[symbol];
  if (!token) return 0;
  if (token.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
    return parseFloat(formatUnits(await publicClient.getBalance({ address: wallet }), 18));
  }
  const bal = await publicClient.readContract({ address: token.address, abi: ERC20_ABI, functionName: 'balanceOf', args: [wallet] });
  return parseFloat(formatUnits(bal, token.decimals));
}

export async function getAllBalances(wallet: Address): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  await Promise.all(Object.keys(XLAYER_TOKENS).map(async sym => {
    results[sym] = await getTokenBalance(wallet, sym).catch(() => 0);
  }));
  return results;
}

// ── OKX DEX — get quote (API) ─────────────────────────────────────────────────
export interface DexQuote {
  fromToken:    string;
  toToken:      string;
  fromAmount:   number;
  toAmount:     number;
  priceImpact:  number;
  route:        string;
  source:       'okx-api' | 'izumi-onchain' | 'estimate';
  calldata?:    string;
  routerAddr?:  string;
}

export async function getOKXDexQuote(fromSym: string, toSym: string, amountUsd: number): Promise<DexQuote> {
  const from = XLAYER_TOKENS[fromSym];
  const to   = XLAYER_TOKENS[toSym];
  if (!from || !to) throw new Error(`Unknown token: ${fromSym} or ${toSym}`);

  const amountIn = BigInt(Math.floor(amountUsd * 10 ** from.decimals)).toString();
  const path = `/api/v6/dex/aggregator/quote?chainIndex=196&fromTokenAddress=${from.address}&toTokenAddress=${to.address}&amount=${amountIn}`;

  const res  = await fetch(`https://www.okx.com${path}`, { headers: getOKXHeaders(path) });
  const json = await res.json();

  if (json.code !== '0' || !json.data?.[0]) throw new Error(`OKX DEX quote: ${json.msg || json.code}`);
  const q = json.data[0];

  const toAmount    = parseFloat(formatUnits(BigInt(q.toTokenAmount ?? '0'), to.decimals));
  const priceImpact = Math.abs(parseFloat(q.priceImpactPercent ?? '0'));
  const route       = q.dexRouterList?.map((r: any) => r.dexProtocol?.dexName).filter(Boolean).join(' → ') || 'OKX DEX';

  return { fromToken: fromSym, toToken: toSym, fromAmount: amountUsd, toAmount, priceImpact, route, source: 'okx-api' };
}

// ── OKX DEX — get full swap calldata (API) ───────────────────────────────────
export async function getOKXSwapCalldata(fromSym: string, toSym: string, amountUsd: number, wallet: Address): Promise<DexQuote & { calldata: string; routerAddr: string }> {
  const from = XLAYER_TOKENS[fromSym];
  const to   = XLAYER_TOKENS[toSym];
  if (!from || !to) throw new Error(`Unknown token: ${fromSym} or ${toSym}`);

  const amountIn = BigInt(Math.floor(amountUsd * 10 ** from.decimals)).toString();
  const path = `/api/v6/dex/aggregator/swap?chainIndex=196&fromTokenAddress=${from.address}&toTokenAddress=${to.address}&amount=${amountIn}&userWalletAddress=${wallet}&slippagePercent=1`;

  const res  = await fetch(`https://www.okx.com${path}`, { headers: getOKXHeaders(path) });
  const json = await res.json();

  if (json.code !== '0' || !json.data?.[0]) throw new Error(`OKX DEX swap: ${json.msg || json.code}`);
  const d  = json.data[0];
  const q  = await getOKXDexQuote(fromSym, toSym, amountUsd);

  return { ...q, calldata: d.tx?.data, routerAddr: d.tx?.to, source: 'okx-api' };
}

// ── OKX DEX — execute real swap ───────────────────────────────────────────────
export interface SwapResult {
  success: boolean; txHash?: Hash; fromAmount: number; toAmount: number;
  priceImpact: number; gasUsed?: string; dryRun?: boolean; error?: string; route?: string;
}

export async function executeOKXSwap(fromSym: string, toSym: string, amountUsd: number, privateKey: string, dryRun = false): Promise<SwapResult> {
  const wc = walletClientFor(privateKey);

  // Always get quote first for display
  let quote: DexQuote;
  try { quote = await getOKXDexQuote(fromSym, toSym, amountUsd); }
  catch (e: any) { return { success: false, fromAmount: amountUsd, toAmount: 0, priceImpact: 0, error: e.message }; }

  if (dryRun) {
    console.log(`[okx:dry] ${fromSym}→${toSym} $${amountUsd} via ${quote.route}`);
    return { success: true, dryRun: true, fromAmount: amountUsd, toAmount: quote.toAmount, priceImpact: quote.priceImpact, route: quote.route };
  }

  try {
    const swapData = await getOKXSwapCalldata(fromSym, toSym, amountUsd, wc.account.address);
    const from = XLAYER_TOKENS[fromSym];

    // Approve ERC-20 if needed
    if (from.address !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
      const amountIn = BigInt(Math.floor(amountUsd * 10 ** from.decimals));
      await ensureApproval(from.address, swapData.routerAddr as Address, amountIn, wc);
    }

    // Execute via OKX router calldata
    const txHash = await wc.client.sendTransaction({
      to:   swapData.routerAddr as Address,
      data: swapData.calldata as `0x${string}`,
      value: from.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        ? BigInt(Math.floor(amountUsd * 10 ** from.decimals)) : BigInt(0),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
    console.log(`[okx] ✅ ${fromSym}→${toSym} $${amountUsd} | tx=${txHash} | gas=${receipt.gasUsed}`);

    return { success: true, txHash, fromAmount: amountUsd, toAmount: swapData.toAmount, priceImpact: swapData.priceImpact, gasUsed: receipt.gasUsed.toString(), route: swapData.route };
  } catch (e: any) {
    console.error(`[okx] ❌ ${fromSym}→${toSym}:`, e.message?.slice(0, 200));
    return { success: false, fromAmount: amountUsd, toAmount: 0, priceImpact: 0, error: e.message?.slice(0, 200) };
  }
}

// ── iZUMi — direct on-chain quote ────────────────────────────────────────────
export async function getIZUMIQuote(fromSym: string, toSym: string, amountUsd: number): Promise<DexQuote> {
  const from = XLAYER_TOKENS[fromSym];
  const to   = XLAYER_TOKENS[toSym];
  if (!from || !to) throw new Error(`Unknown token: ${fromSym} or ${toSym}`);

  const amountIn = BigInt(Math.floor(amountUsd * 10 ** from.decimals));
  // iZUMi path: [tokenA, fee(3 bytes), tokenB] packed
  const FEE_3000 = 3000;
  const path = encodePacked(['address', 'uint24', 'address'], [from.address, FEE_3000, to.address]);

  try {
    const [amountOut] = await publicClient.readContract({
      address: PROTOCOLS.IZUMI_QUOTER.address,
      abi:     IZUMI_QUOTER_ABI,
      functionName: 'quoteExactInput',
      args:    [path, amountIn],
    }) as [bigint, number[]];

    const toAmount    = parseFloat(formatUnits(amountOut, to.decimals));
    const priceImpact = Math.abs(((toAmount - amountUsd) / amountUsd) * 100);

    return { fromToken: fromSym, toToken: toSym, fromAmount: amountUsd, toAmount, priceImpact, route: 'iZUMi Finance (direct)', source: 'izumi-onchain' };
  } catch (e: any) {
    throw new Error(`iZUMi quote failed: ${e.message?.slice(0, 100)}`);
  }
}

// ── iZUMi — direct on-chain swap ─────────────────────────────────────────────
export async function executeIZUMISwap(fromSym: string, toSym: string, amountUsd: number, privateKey: string, dryRun = false): Promise<SwapResult> {
  const from = XLAYER_TOKENS[fromSym];
  const to   = XLAYER_TOKENS[toSym];
  if (!from || !to) return { success: false, fromAmount: amountUsd, toAmount: 0, priceImpact: 0, error: 'Unknown token' };

  let quote: DexQuote;
  try { quote = await getIZUMIQuote(fromSym, toSym, amountUsd); }
  catch (e: any) {
    // Fallback to OKX quote if iZUMi quoter fails
    try { quote = await getOKXDexQuote(fromSym, toSym, amountUsd); }
    catch { return { success: false, fromAmount: amountUsd, toAmount: 0, priceImpact: 0, error: e.message }; }
  }

  if (dryRun) {
    return { success: true, dryRun: true, fromAmount: amountUsd, toAmount: quote.toAmount, priceImpact: quote.priceImpact, route: quote.route };
  }

  const wc = walletClientFor(privateKey);
  const amountIn  = BigInt(Math.floor(amountUsd * 10 ** from.decimals));
  // 0.5% slippage: minAcquired = 99.5% of quote
  const minOut    = BigInt(Math.floor(Number(BigInt(Math.floor(quote.toAmount * 10 ** to.decimals))) * 0.995));
  const deadline  = BigInt(Math.floor(Date.now() / 1000) + 300);
  const FEE_3000  = 3000;
  const path      = encodePacked(['address', 'uint24', 'address'], [from.address, FEE_3000, to.address]);

  try {
    await ensureApproval(from.address, PROTOCOLS.IZUMI_SWAP.address, amountIn, wc);

    const txHash = await wc.client.writeContract({
      address:      PROTOCOLS.IZUMI_SWAP.address,
      abi:          IZUMI_SWAP_ABI,
      functionName: 'swapAmount',
      args:         [{ path, recipient: wc.account.address, amount: amountIn, minAcquired: minOut, deadline }],
      value:        from.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ? amountIn : BigInt(0),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
    console.log(`[izumi] ✅ ${fromSym}→${toSym} $${amountUsd} tx=${txHash} gas=${receipt.gasUsed}`);

    return { success: true, txHash, fromAmount: amountUsd, toAmount: quote.toAmount, priceImpact: quote.priceImpact, gasUsed: receipt.gasUsed.toString(), route: 'iZUMi Finance' };
  } catch (e: any) {
    return { success: false, fromAmount: amountUsd, toAmount: 0, priceImpact: 0, error: e.message?.slice(0, 200) };
  }
}

// ── Smart swap router — tries OKX first, falls back to iZUMi ─────────────────
export async function smartSwap(fromSym: string, toSym: string, amountUsd: number, privateKey: string, dryRun = false): Promise<SwapResult> {
  // 1. Try OKX DEX Aggregator (best routing)
  const okxResult = await executeOKXSwap(fromSym, toSym, amountUsd, privateKey, dryRun);
  if (okxResult.success) return okxResult;

  // 2. Fall back to iZUMi direct
  console.log(`[swap] OKX failed (${okxResult.error?.slice(0,50)}), trying iZUMi direct...`);
  return executeIZUMISwap(fromSym, toSym, amountUsd, privateKey, dryRun);
}

// ── Smart quote — tries OKX first, falls back to iZUMi ───────────────────────
export async function smartQuote(fromSym: string, toSym: string, amountUsd: number): Promise<DexQuote> {
  try { return await getOKXDexQuote(fromSym, toSym, amountUsd); }
  catch {
    try { return await getIZUMIQuote(fromSym, toSym, amountUsd); }
    catch (e: any) { throw new Error(`No liquidity for ${fromSym}→${toSym}: ${e.message}`); }
  }
}

// ── Aave V3 ────────────────────────────────────────────────────────────────────
export interface AavePosition {
  totalCollateralUsd: number; totalDebtUsd: number; availableBorrowUsd: number;
  healthFactor: number; ltv: number; reserves: string[];
}

export async function getAavePosition(wallet: Address): Promise<AavePosition> {
  const POOL = PROTOCOLS.AAVE_V3.address;
  const data = await publicClient.readContract({
    address: POOL, abi: AAVE_POOL_ABI, functionName: 'getUserAccountData', args: [wallet],
  }) as [bigint, bigint, bigint, bigint, bigint, bigint];
  const [col, debt, avail, , ltv, hf] = data;

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

export async function aaveSupply(asset: string, amountUsd: number, privateKey: string, dryRun = false): Promise<{ txHash?: Hash; success: boolean; error?: string }> {
  const token = XLAYER_TOKENS[asset];
  if (!token) return { success: false, error: `Unknown asset: ${asset}` };
  if (dryRun) return { success: true };

  const POOL = PROTOCOLS.AAVE_V3.address;
  const amount = parseUnits(amountUsd.toString(), token.decimals);
  const wc = walletClientFor(privateKey);

  try {
    await ensureApproval(token.address, POOL, amount, wc);
    const tx = await wc.client.writeContract({
      address: POOL, abi: AAVE_POOL_ABI, functionName: 'supply',
      args: [token.address, amount, wc.account.address, 0],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    return { success: true, txHash: tx };
  } catch (e: any) { return { success: false, error: e.message?.slice(0, 200) }; }
}

export async function aaveWithdraw(asset: string, amountUsd: number, privateKey: string, dryRun = false): Promise<{ txHash?: Hash; success: boolean; amountOut?: number; error?: string }> {
  const token = XLAYER_TOKENS[asset];
  if (!token) return { success: false, error: `Unknown asset: ${asset}` };
  if (dryRun) return { success: true, amountOut: amountUsd };

  const POOL = PROTOCOLS.AAVE_V3.address;
  const amount = parseUnits(amountUsd.toString(), token.decimals);
  const wc = walletClientFor(privateKey);

  try {
    const tx = await wc.client.writeContract({
      address: POOL, abi: AAVE_POOL_ABI, functionName: 'withdraw',
      args: [token.address, amount, wc.account.address],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    return { success: true, txHash: tx, amountOut: amountUsd };
  } catch (e: any) { return { success: false, error: e.message?.slice(0, 200) }; }
}

export async function aaveBorrow(asset: string, amountUsd: number, privateKey: string, dryRun = false): Promise<{ txHash?: Hash; success: boolean; error?: string }> {
  const token = XLAYER_TOKENS[asset];
  if (!token) return { success: false, error: `Unknown asset: ${asset}` };
  if (dryRun) return { success: true };

  const POOL = PROTOCOLS.AAVE_V3.address;
  const amount = parseUnits(amountUsd.toString(), token.decimals);
  const wc = walletClientFor(privateKey);

  try {
    const tx = await wc.client.writeContract({
      address: POOL, abi: AAVE_POOL_ABI, functionName: 'borrow',
      args: [token.address, amount, BigInt(2), 0, wc.account.address],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    return { success: true, txHash: tx };
  } catch (e: any) { return { success: false, error: e.message?.slice(0, 200) }; }
}

// ── Protocol health check ──────────────────────────────────────────────────────
export async function getProtocolStatus(): Promise<Record<string, { live: boolean; bytecodeSize: number }>> {
  const results: Record<string, { live: boolean; bytecodeSize: number }> = {};
  const protocolsToCheck = Object.entries(PROTOCOLS).filter(([, p]) =>
    p.address !== '0x0000000000000000000000000000000000000000'
  );
  await Promise.all(protocolsToCheck.map(async ([key, proto]) => {
    const code = await publicClient.getBytecode({ address: proto.address }).catch(() => null);
    results[key] = { live: (code?.length ?? 0) > 4, bytecodeSize: code?.length ?? 0 };
  }));
  // OKX DEX Aggregator is API-only — always live if OKX API is reachable
  results['OKX_DEX_AGG'] = { live: true, bytecodeSize: 0 };
  return results;
}
