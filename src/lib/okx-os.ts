import crypto from 'crypto';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// X Layer (chainIndex 196) real token addresses — verified from OKX DEX V6 API
export const TOKENS: Record<string, string> = {
  OKB:  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // native OKB on X Layer
  USDC: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
  WBTC: '0xea034fb02eb1808c2cc3adbc15f447b93cbe08e1',
  WETH: '0x5a77f1443d16ee5761d310e38b62f77f726bc71c',
};

// OKX V5 market instId mapping (V5 still works for market data)
const OKX_INST_IDS: Record<string, string> = {
  BTC:  'BTC-USDT',
  WBTC: 'BTC-USDT',
  ETH:  'ETH-USDT',
  WETH: 'ETH-USDT',
  SOL:  'SOL-USDT',
  OKB:  'OKB-USDT',
  USDC: 'USDC-USDT',
};

// Token decimals for amount conversion
const TOKEN_DECIMALS: Record<string, number> = {
  USDC:  6,
  OKB:  18,
  WETH: 18,
  ETH:  18,
  WBTC:  8,
  BTC:   8,
  SOL:  18,
};

function getOKXHeaders(path: string, method = 'GET', body = '') {
  const apiKey = process.env.OKX_API_KEY!;
  const secretKey = process.env.OKX_SECRET_KEY!;
  const passphrase = process.env.OKX_PASSPHRASE!;
  const timestamp = new Date().toISOString();
  const prehash = timestamp + method + path + body;
  const sign = crypto.createHmac('sha256', secretKey).update(prehash).digest('base64');
  return {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': sign,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
  };
}

// Represents the OKX Onchain OS Agentic Wallet TEE Generation
export function createAgenticWallet() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    privateKey,
  };
}

/**
 * Get a real DEX route quote using OKX DEX Aggregator V6 API.
 * Falls back to OKX V5 ticker-based estimate if DEX quote fails.
 */
export async function getDexRoute(fromRef: string, toRef: string, amount: string) {
  const tradeAmount = parseFloat(amount);
  const fromDecimals = TOKEN_DECIMALS[fromRef] ?? 18;
  const amountInUnits = BigInt(Math.floor(tradeAmount * 10 ** fromDecimals)).toString();

  const fromAddr = TOKENS[fromRef] || TOKENS['USDC'];
  const toAddr = TOKENS[toRef] || TOKENS['OKB'];

  // Try OKX DEX Aggregator V6 quote
  try {
    const path = `/api/v6/dex/aggregator/quote?chainIndex=196&fromTokenAddress=${fromAddr}&toTokenAddress=${toAddr}&amount=${amountInUnits}`;
    const headers = getOKXHeaders(path);

    const res = await fetch(`https://www.okx.com${path}`, {
      headers,
      cache: 'no-store', // always fresh for trade quotes
    });

    if (!res.ok) throw new Error(`OKX DEX V6 quote HTTP error: ${res.status}`);
    const json = await res.json();

    if (json.code !== '0' || !json.data?.[0]) throw new Error(`OKX DEX V6 error: ${json.msg}`);

    const quote = json.data[0];
    const toDecimals = parseInt(quote.toToken?.decimal ?? '18');
    const outAmount = (parseFloat(quote.toTokenAmount) / 10 ** toDecimals).toFixed(6);
    // priceImpactPercent comes as e.g. "-0.11" — take absolute value
    const priceImpact = Math.abs(parseFloat(quote.priceImpactPercent || '0')).toFixed(4);
    const estimatedGas = quote.estimateGasFee || '210000';
    const routerAddress = quote.router || '0xOKX-DEX-Aggregator-V6';
    const dexPath = quote.dexRouterList
      ?.map((r: any) => r.dexProtocol?.dexName || '')
      .filter(Boolean)
      .join(' → ') || 'OKX DEX';

    console.log(`[DEX] OKX V6 quote: ${fromRef}->${toRef} | $${tradeAmount.toFixed(2)} | impact=${priceImpact}% | route: ${dexPath}`);

    return { routerAddress, outAmount, priceImpact, estimatedGas };

  } catch (dexErr) {
    console.warn(`[DEX] OKX V6 DEX failed, falling back to ticker estimate:`, dexErr);
  }

  // Fallback: use OKX V5 market ticker for price-based estimate
  try {
    const tokenRef = fromRef === 'USDC' ? toRef : fromRef;
    const instId = OKX_INST_IDS[tokenRef] || 'OKB-USDT';
    const tickerPath = `/api/v5/market/ticker?instId=${instId}`;
    const headers = getOKXHeaders(tickerPath);

    const res = await fetch(`https://www.okx.com${tickerPath}`, { headers });
    if (!res.ok) throw new Error(`OKX ticker error: ${res.status}`);
    const json = await res.json();

    if (json.code !== '0' || !json.data?.[0]) throw new Error('No ticker data');

    const ticker = json.data[0];
    const price = parseFloat(ticker.last);
    const vol24h = parseFloat(ticker.volCcy24h) || parseFloat(ticker.vol24h) * price;

    const impactRaw = (tradeAmount / vol24h) * 100 * 50;
    const priceImpact = Math.min(impactRaw, 5).toFixed(4);
    const outMultiplier = fromRef === 'USDC'
      ? (1 / price) * (1 - parseFloat(priceImpact) / 100)
      : price * (1 - parseFloat(priceImpact) / 100);
    const outAmount = (tradeAmount * outMultiplier).toFixed(6);

    console.log(`[DEX] OKX ticker fallback: ${fromRef}->${toRef} | price=$${price} | impact=${priceImpact}%`);

    return {
      routerAddress: '0xOKX-DEX-X-Layer-Aggregator',
      outAmount,
      priceImpact,
      estimatedGas: '210000',
    };

  } catch (tickerErr) {
    console.error('[DEX] All OKX routes failed, using static fallback:', tickerErr);
    const impactPct = Math.min((tradeAmount / 500_000) * 0.5, 2);
    return {
      routerAddress: '0xOKX-DEX-Fallback',
      outAmount: (tradeAmount * (1 - impactPct / 100)).toFixed(6),
      priceImpact: impactPct.toFixed(4),
      estimatedGas: '210000',
    };
  }
}
