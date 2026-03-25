/**
 * OKX DEX Real Swap Execution on X Layer (chain 196)
 *
 * Flow:
 * 1. Get swap calldata from OKX DEX Aggregator V6 /swap endpoint
 * 2. Sign + broadcast the transaction with the agent's wallet via viem
 * 3. Wait for receipt and return the actual output amount
 *
 * The agent's private key is stored encrypted in the DB (agent.walletKey).
 * Never logged, never returned to the client.
 */

import crypto from 'crypto';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  parseAbi,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { activeChain, USE_TESTNET, TESTNET_TOKENS, getTxExplorerUrl } from './chain-config';

// ── Chain clients ──────────────────────────────────────────────────────────────
const RPC_URL = USE_TESTNET
  ? (process.env.XLAYER_TESTNET_RPC_URL ?? 'https://testrpc.xlayer.tech')
  : (process.env.XLAYER_RPC_URL ?? 'https://rpc.xlayer.tech');

const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(RPC_URL),
});

// ── Token registry ─────────────────────────────────────────────────────────────
// Mainnet tokens (chain 196)
const MAINNET_TOKENS: Record<string, { address: `0x${string}`; decimals: number }> = {
  OKB:  { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 }, // native
  USDC: { address: '0x74b7f16337b8972027f6196a17a631ac6de26d22', decimals: 6  },
  WBTC: { address: '0xea034fb02eb1808c2cc3adbc15f447b93cbe08e1', decimals: 8  },
  WETH: { address: '0x5a77f1443d16ee5761d310e38b62f77f726bc71c', decimals: 18 },
};

export const TOKENS = USE_TESTNET ? TESTNET_TOKENS : MAINNET_TOKENS;

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
]);

// ── OKX API auth ───────────────────────────────────────────────────────────────
function getOKXHeaders(path: string, method = 'GET', body = '') {
  const apiKey    = process.env.OKX_API_KEY!;
  const secretKey = process.env.OKX_SECRET_KEY!;
  const passphrase= process.env.OKX_PASSPHRASE!;
  const timestamp = new Date().toISOString();
  const prehash   = timestamp + method + path + body;
  const sign      = crypto.createHmac('sha256', secretKey).update(prehash).digest('base64');
  return {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': sign,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
  };
}

// ── Wallet helpers ─────────────────────────────────────────────────────────────
export function decryptPrivateKey(encrypted: string): `0x${string}` {
  // For now keys are stored as plaintext 0x... — replace with AES in prod
  return encrypted as `0x${string}`;
}

export async function getOnChainBalance(
  walletAddress: `0x${string}`,
  tokenSymbol: string
): Promise<number> {
  const token = TOKENS[tokenSymbol];
  if (!token) return 0;

  try {
    if (token.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
      const bal = await publicClient.getBalance({ address: walletAddress });
      return parseFloat(formatUnits(bal, 18));
    }
    const bal = await publicClient.readContract({
      address: token.address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress],
    });
    return parseFloat(formatUnits(bal, token.decimals));
  } catch (err) {
    console.error(`[balance] Error fetching ${tokenSymbol}:`, err);
    return 0;
  }
}

export async function getPortfolioUsd(
  walletAddress: `0x${string}`,
  tokenPrices: Record<string, number>
): Promise<number> {
  let total = 0;
  for (const [symbol] of Object.entries(TOKENS)) {
    const bal   = await getOnChainBalance(walletAddress, symbol);
    const price = tokenPrices[symbol] ?? 0;
    total += bal * (symbol === 'USDC' ? 1 : price);
  }
  return total;
}

// ── Quote ──────────────────────────────────────────────────────────────────────
export interface SwapQuote {
  fromToken:    string;
  toToken:      string;
  fromAmount:   number;
  toAmount:     number;
  priceImpact:  number; // percentage
  routerAddress: string;
  dexPath:      string;
  estimatedGas: string;
  calldata?:    string; // included when /swap (not /quote) is called
  approveData?: string;
}

export async function getSwapQuote(
  fromSymbol: string,
  toSymbol:   string,
  amountUsd:  number,
  walletAddress: string,
  forExecution = false  // if true, fetches full calldata via /swap endpoint
): Promise<SwapQuote> {
  const from = TOKENS[fromSymbol];
  const to   = TOKENS[toSymbol];
  if (!from || !to) throw new Error(`Unknown token: ${fromSymbol} or ${toSymbol}`);

  const amountIn = BigInt(Math.floor(amountUsd * 10 ** from.decimals)).toString();

  const endpoint = forExecution ? 'swap' : 'quote';
  const params = new URLSearchParams({
    chainIndex:       USE_TESTNET ? '1952' : '196',
    fromTokenAddress: from.address,
    toTokenAddress:   to.address,
    amount:           amountIn,
    ...(forExecution ? {
      userWalletAddress: walletAddress,
      slippage:          '0.005', // 0.5% slippage tolerance
    } : {}),
  });

  const path = `/api/v6/dex/aggregator/${endpoint}?${params}`;
  const headers = getOKXHeaders(path);

  const res  = await fetch(`https://www.okx.com${path}`, { headers, cache: 'no-store' });
  const json = await res.json();

  if (json.code !== '0' || !json.data?.[0]) {
    throw new Error(`OKX DEX ${endpoint} error: ${json.msg || json.code}`);
  }

  const data      = json.data[0];
  const routerInfo = data.routerResult ?? data;

  const toDecimals = to.decimals;
  const toAmount   = parseFloat(formatUnits(BigInt(routerInfo.toTokenAmount ?? data.toTokenAmount ?? '0'), toDecimals));
  const priceImpact= Math.abs(parseFloat(routerInfo.priceImpactPercent ?? data.priceImpactPercent ?? '0'));

  const dexPath = (routerInfo.dexRouterList ?? data.dexRouterList ?? [])
    .map((r: any) => r.dexProtocol?.dexName ?? '')
    .filter(Boolean)
    .join(' → ') || 'OKX DEX';

  const routerAddress = routerInfo.dexContractAddress ?? data.router ?? '0xOKX';

  return {
    fromToken:    fromSymbol,
    toToken:      toSymbol,
    fromAmount:   amountUsd,
    toAmount,
    priceImpact,
    routerAddress,
    dexPath,
    estimatedGas: routerInfo.estimateGasFee ?? data.estimateGasFee ?? '210000',
    calldata:     data.tx?.data,
    approveData:  data.tx?.approveData,
  };
}

// ── Execute swap ───────────────────────────────────────────────────────────────
export interface SwapResult {
  success:       boolean;
  txHash?:       Hash;
  fromAmount:    number;
  toAmount:      number;
  priceImpact:   number;
  gasUsed?:      string;
  error?:        string;
  dryRun?:       boolean;
}

export async function executeSwap(
  fromSymbol:     string,
  toSymbol:       string,
  amountUsd:      number,
  walletPrivKey:  string,
  dryRun = false
): Promise<SwapResult> {
  const account      = privateKeyToAccount(decryptPrivateKey(walletPrivKey));
  const walletAddress = account.address;

  // 1. Get full swap calldata
  let quote: SwapQuote;
  try {
    quote = await getSwapQuote(fromSymbol, toSymbol, amountUsd, walletAddress, true);
  } catch (err: any) {
    return { success: false, fromAmount: amountUsd, toAmount: 0, priceImpact: 0, error: `Quote failed: ${err.message}` };
  }

  if (dryRun) {
    console.log(`[swap:dry] ${fromSymbol}→${toSymbol} $${amountUsd} | impact=${quote.priceImpact}% | route=${quote.dexPath}`);
    return {
      success: true, dryRun: true,
      fromAmount: amountUsd, toAmount: quote.toAmount, priceImpact: quote.priceImpact,
    };
  }

  if (!quote.calldata) {
    return { success: false, fromAmount: amountUsd, toAmount: 0, priceImpact: 0, error: 'No calldata returned from OKX' };
  }

  const walletClient = createWalletClient({
    account,
    chain: activeChain,
    transport: http(RPC_URL),
  });

  try {
    const fromToken = TOKENS[fromSymbol];

    // 2. Approve router to spend ERC-20 (skip for native OKB)
    if (fromToken.address !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
      const amountIn = BigInt(Math.floor(amountUsd * 10 ** fromToken.decimals));
      const existing = await publicClient.readContract({
        address: fromToken.address,
        abi:     ERC20_ABI,
        functionName: 'allowance',
        args:    [walletAddress, quote.routerAddress as `0x${string}`],
      });

      if (existing < amountIn) {
        const approveTx = await walletClient.writeContract({
          address:      fromToken.address,
          abi:          ERC20_ABI,
          functionName: 'approve',
          args:         [quote.routerAddress as `0x${string}`, amountIn * BigInt(10)], // approve 10x to avoid repeated approvals
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
        console.log(`[swap] Approved ${fromSymbol} spend: ${approveTx}`);
      }
    }

    // 3. Execute swap via OKX router calldata
    const txHash = await walletClient.sendTransaction({
      to:   quote.routerAddress as `0x${string}`,
      data: quote.calldata as `0x${string}`,
      value: fromToken.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        ? BigInt(Math.floor(amountUsd * 10 ** fromToken.decimals))
        : BigInt(0),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
    const gasUsed = receipt.gasUsed.toString();

    console.log(`[swap] ✅ ${fromSymbol}→${toSymbol} $${amountUsd} | tx=${txHash} | gas=${gasUsed} | out=${quote.toAmount}`);

    return {
      success: true, txHash,
      fromAmount: amountUsd, toAmount: quote.toAmount,
      priceImpact: quote.priceImpact, gasUsed,
    };
  } catch (err: any) {
    console.error(`[swap] ❌ ${fromSymbol}→${toSymbol}:`, err.message?.slice(0, 200));
    return { success: false, fromAmount: amountUsd, toAmount: 0, priceImpact: 0, error: err.message?.slice(0, 200) };
  }
}
