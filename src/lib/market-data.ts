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

export async function getMarketContext(): Promise<MarketContext> {
  // In a real app, this would fetch from OKX API or similar.
  // We use a simulated but structured market state for the AI to analyze.
  const randomFactor = () => (Math.random() - 0.5) * 5;
  
  return {
    overallSentiment: Math.random() > 0.5 ? "bullish" : "bearish",
    tokens: [
      {
        symbol: "USDC",
        price: 1.0,
        change24h: 0.01,
        volume24h: "$1.2B",
        trend: "flat",
      },
      {
        symbol: "OKB",
        price: Math.max(10, 45.32 + randomFactor()),
        change24h: 2.4 + randomFactor() / 2,
        volume24h: "$34M",
        trend: "up",
      },
      {
        symbol: "WETH",
        price: Math.max(1000, 3450.2 + randomFactor() * 10),
        change24h: 1.5 + randomFactor() / 2,
        volume24h: "$450M",
        trend: "up",
      },
      {
        symbol: "MEME_COIN",
        price: Math.max(0.001, 0.45 + (randomFactor() / 10)),
        change24h: 15.4 + randomFactor() * 2,
        volume24h: "$2M",
        trend: "up",
      }
    ],
    whaleMovements: [
      {
        wallet: "0x7a2...3f1c",
        action: Math.random() > 0.5 ? "BUY" : "SELL",
        amount: "500 OKB",
        token: "OKB",
        timestamp: "2 mins ago",
      },
      {
        wallet: "0x99f...8b1e",
        action: Math.random() > 0.5 ? "BUY" : "SELL",
        amount: "15,000 MEME_COIN",
        token: "MEME_COIN",
        timestamp: "5 mins ago",
      }
    ]
  };
}
