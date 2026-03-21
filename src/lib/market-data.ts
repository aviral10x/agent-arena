import crypto from 'crypto';

export interface TokenData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: string;
  trend: "up" | "down" | "flat";
}

export interface WhaleMovement {
  wallet: string;
  action: "BUY" | "SELL";
  amount: string;
  token: string;
  timestamp: string;
}

export interface MarketContext {
  tokens: TokenData[];
  whaleMovements: WhaleMovement[];
  overallSentiment: "bullish" | "bearish" | "neutral";
}

function generateOkxHeaders(method: string, requestPath: string, body: string = '') {
  const apiKey = process.env.OKX_API_KEY;
  const secretKey = process.env.OKX_SECRET_KEY;
  const passphrase = process.env.OKX_PASSPHRASE;
  
  if (!apiKey || !secretKey || !passphrase) {
    throw new Error("Missing OKX API credentials in .env");
  }

  const timestamp = new Date().toISOString();
  const signStr = timestamp + method + requestPath + body;
  const signature = crypto.createHmac('sha256', secretKey).update(signStr).digest('base64');
  
  return {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json'
  };
}

// Format numbers to compact M/B/K format
function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

export async function getMarketContext(): Promise<MarketContext> {
  // If the user hasn't filled the passphrase yet, fallback gracefully so the UI doesn't crash
  if (!process.env.OKX_PASSPHRASE || process.env.OKX_PASSPHRASE === "Enter your passphrase here") {
    console.warn("OKX_PASSPHRASE not set. Returning mock market data.");
    return getMockMarketContext();
  }

  try {
    const requestPath = '/api/v5/market/tickers?instType=SPOT';
    const response = await fetch(`https://www.okx.com${requestPath}`, {
      method: "GET",
      headers: generateOkxHeaders("GET", requestPath),
      next: { revalidate: 10 } // Cache for 10 seconds to avoid API spam via tick loops
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OKX API Error:", errText);
      throw new Error(`OKX fetch failed: ${response.status}`);
    }

    const json = await response.json();
    const data = Array.isArray(json.data) ? json.data : [];

    // Extract specific tokens we care about for the Agent Arena
    const targetSymbols = ["OKB-USDT", "BTC-USDT", "ETH-USDT", "SOL-USDT"];
    const tokens: TokenData[] = [];
    
    let totalChange = 0;

    for (const inst of targetSymbols) {
      const ticker = data.find((t: any) => t.instId === inst);
      if (!ticker) continue;

      const price = parseFloat(ticker.last);
      const open24h = parseFloat(ticker.sodUtc0);
      const change24h = ((price - open24h) / open24h) * 100;
      const volumeUsd = parseFloat(ticker.volCcy24h);

      totalChange += change24h;

      tokens.push({
        symbol: inst.replace("-USDT", ""),
        price,
        change24h,
        volume24h: formatVolume(volumeUsd),
        trend: change24h > 2 ? "up" : change24h < -2 ? "down" : "flat",
      });
    }

    // Determine overall sentiment
    const avgChange = totalChange / (tokens.length || 1);
    const overallSentiment = avgChange > 1 ? "bullish" : avgChange < -1 ? "bearish" : "neutral";

    // Mock whale movements since OKX websocket/orderbook streams are complex for a simple tick API
    const whaleMovements: WhaleMovement[] = [
      {
        wallet: "0x7a2...3f1c",
        action: Math.random() > 0.5 ? "BUY" : "SELL",
        amount: "1,500 OKB",
        token: "OKB",
        timestamp: "1 min ago",
      },
      {
        wallet: "0x99f...8b1e",
        action: avgChange > 0 ? "BUY" : "SELL",
        amount: "450 ETH",
        token: "ETH",
        timestamp: "3 mins ago",
      }
    ];

    return {
      tokens,
      whaleMovements,
      overallSentiment
    };

  } catch (err) {
    console.error("Failed to parse real OKX data, falling back to mock:", err);
    return getMockMarketContext();
  }
}

function getMockMarketContext(): MarketContext {
  const randomFactor = () => (Math.random() - 0.5) * 5;
  
  return {
    overallSentiment: "bullish",
    tokens: [
      { symbol: "OKB", price: 45.32, change24h: 2.4, volume24h: "$34M", trend: "up" },
      { symbol: "BTC", price: 65120.5, change24h: 1.5, volume24h: "$1.2B", trend: "up" },
    ],
    whaleMovements: []
  };
}
