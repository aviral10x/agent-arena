import crypto from 'crypto';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// X Layer (196) prominent token addresses for the Arena
export const TOKENS: Record<string, string> = {
  USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Mock USDC for demo/routing
  OKB: '0xdf54b6c6195ea4fa9a42112dfcdcaec8922c172e', 
  WETH: '0x5a77f1443d16ee5761d310e38b62f77f726bc71c',
  WBTC: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
  SOL: '0x...sol', // Mocks
};

// Represents the OKX Onchain OS Agentic Wallet TEE Generation
export function createAgenticWallet() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  return {
    address: account.address,
    privateKey, // In a real TEE this never leaves the enclave
  };
}

export async function getDexRoute(fromRef: string, toRef: string, amount: string) {
  const apiKey = process.env.OKX_API_KEY;
  const secretKey = process.env.OKX_SECRET_KEY;
  const passphrase = process.env.OKX_PASSPHRASE;

  if (!apiKey || !secretKey || !passphrase) {
    console.warn("Missing OKX credentials. Using local simulation for swap routing.");
    return fallbackSimulation(amount);
  }

  try {
    const chainId = '196';
    const fromToken = TOKENS[fromRef] || TOKENS['USDC'];
    const toToken = TOKENS[toRef] || TOKENS['OKB'];
    
    // We hit the official OKX DEX Aggregator Quote API
    const requestPath = `/api/v5/dex/aggregator/quote?chainId=${chainId}&amount=${amount}&fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&slippage=0.01`;

    const timestamp = new Date().toISOString();
    const signStr = timestamp + "GET" + requestPath;
    const signature = crypto.createHmac('sha256', secretKey).update(signStr).digest('base64');
    
    console.log(`[OnchainOS] Route requested: ${chainId} | ${fromRef} -> ${toRef} | Amt: ${amount}`);

    const response = await fetch(`https://www.okx.com${requestPath}`, {
      method: "GET",
      headers: {
        'OK-ACCESS-KEY': apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': passphrase,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OKX DEX API error: ${response.status}`);
    }

    const json = await response.json();
    
    // In a full production app we return the calldata to broadcast via Onchain Gateway.
    // For the agent simulation score, we just need the aggregated output amount and price impact.
    if (json.code === "0" && json.data && json.data.length > 0) {
      const routeData = json.data[0];
      return {
        routerAddress: routeData.routerAddress,
        outAmount: routeData.toTokenAmount, // Amount of tokens received
        priceImpact: routeData.priceImpact, 
        estimatedGas: routeData.estimatedGas
      };
    }

    return fallbackSimulation(amount);
  } catch (err) {
    console.error("OnchainOS DEX Router failed:", err);
    return fallbackSimulation(amount);
  }
}

// Simulated fallback if API rate limited or no tokens match
function fallbackSimulation(amountIn: string) {
  const amount = parseFloat(amountIn);
  // Add a 0.1% to 1.5% randomized simulated market edge since we are testing
  const simulatedImpact = ((Math.random() * 1.5) + 0.1).toFixed(2);
  const outMultiplier = 1 + (Math.random() > 0.4 ? (Math.random() * 0.05) : -(Math.random() * 0.03));
  
  return {
    routerAddress: "0xMockRouter...OKX",
    outAmount: (amount * outMultiplier).toString(),
    priceImpact: simulatedImpact,
    estimatedGas: "210000" // Standard 
  };
}
