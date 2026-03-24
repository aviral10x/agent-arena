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

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

// OKX REST API auth headers (required even for market data with API key)
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

// Symbols to track in the Arena
const ARENA_SYMBOLS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'OKB-USDT'];

export async function getMarketContext(): Promise<MarketContext> {
  try {
    // OKX GET /api/v5/market/tickers?instType=SPOT — public endpoint, but signed for reliability
    const path = '/api/v5/market/tickers?instType=SPOT';
    const headers = getOKXHeaders(path);

    const res = await fetch(`https://www.okx.com${path}`, {
      headers,
      next: { revalidate: 15 },
    });

    if (!res.ok) throw new Error(`OKX market tickers error: ${res.status}`);
    const json = await res.json();

    if (json.code !== '0') throw new Error(`OKX API error: ${json.msg}`);

    // Filter to our Arena symbols
    const tickerMap: Record<string, any> = {};
    for (const t of json.data) {
      if (ARENA_SYMBOLS.includes(t.instId)) {
        tickerMap[t.instId] = t;
      }
    }

    let totalChange = 0;
    const tokens: TokenData[] = ARENA_SYMBOLS.map(instId => {
      const t = tickerMap[instId];
      const symbol = instId.replace('-USDT', '');
      if (!t) return { symbol, price: 0, change24h: 0, volume24h: '$0', trend: 'flat' as const };

      const price = parseFloat(t.last);
      const open24h = parseFloat(t.open24h);
      const change24h = open24h > 0 ? ((price - open24h) / open24h) * 100 : 0;
      const volumeUsd = parseFloat(t.volCcy24h) || parseFloat(t.vol24h) * price;

      totalChange += change24h;

      return {
        symbol,
        price,
        change24h,
        volume24h: formatVolume(volumeUsd),
        trend: change24h > 2 ? 'up' : change24h < -2 ? 'down' : 'flat',
      };
    });

    const avgChange = totalChange / tokens.length;
    const overallSentiment = avgChange > 1 ? 'bullish' : avgChange < -1 ? 'bearish' : 'neutral';

    // Derive whale movements from the biggest movers
    const bigMover = tokens.reduce((a, b) => Math.abs(a.change24h) > Math.abs(b.change24h) ? a : b);
    const whaleMovements: WhaleMovement[] = [
      {
        wallet: '0x7a2...3f1c',
        action: bigMover.change24h > 0 ? 'BUY' : 'SELL',
        amount: `${(Math.random() * 2000 + 500).toFixed(0)} ${bigMover.symbol}`,
        token: bigMover.symbol,
        timestamp: '1 min ago',
      },
      {
        wallet: '0x99f...8b1e',
        action: avgChange > 0 ? 'BUY' : 'SELL',
        amount: `${(Math.random() * 300 + 50).toFixed(0)} ETH`,
        token: 'ETH',
        timestamp: '3 mins ago',
      },
    ];

    console.log(`[Market] OKX live data: BTC=$${tokens.find(t => t.symbol === 'BTC')?.price.toFixed(0)}, sentiment=${overallSentiment}`);

    return { tokens, whaleMovements, overallSentiment };

  } catch (err) {
    console.error('[Market] OKX fetch failed, using simulated market data:', (err as any)?.message?.slice(0, 80));
    // Simulated market with realistic volatility so mock agents actually trade
    const seed = Date.now() % 10000;
    const rng = (s: number) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
    const mkChange = (i: number) => parseFloat(((rng(seed + i) * 14) - 7).toFixed(2)); // -7% to +7%
    const tokens = [
      { symbol: 'BTC',  price: 87000 + rng(seed)   * 3000, change24h: mkChange(1), volume24h: '$1.2B', trend: mkChange(1) > 2 ? 'up' as const : mkChange(1) < -2 ? 'down' as const : 'flat' as const },
      { symbol: 'ETH',  price: 2000  + rng(seed+1) * 300,  change24h: mkChange(2), volume24h: '$600M', trend: mkChange(2) > 2 ? 'up' as const : mkChange(2) < -2 ? 'down' as const : 'flat' as const },
      { symbol: 'SOL',  price: 130   + rng(seed+2) * 30,   change24h: mkChange(3), volume24h: '$250M', trend: mkChange(3) > 2 ? 'up' as const : mkChange(3) < -2 ? 'down' as const : 'flat' as const },
      { symbol: 'OKB',  price: 45    + rng(seed+3) * 8,    change24h: mkChange(4), volume24h: '$40M',  trend: mkChange(4) > 2 ? 'up' as const : mkChange(4) < -2 ? 'down' as const : 'flat' as const },
    ];
    const avgChange = tokens.reduce((s, t) => s + t.change24h, 0) / tokens.length;
    const sentiment = avgChange > 1 ? 'bullish' as const : avgChange < -1 ? 'bearish' as const : 'neutral' as const;
    const bigMover = tokens.reduce((a, b) => Math.abs(a.change24h) > Math.abs(b.change24h) ? a : b);
    return {
      overallSentiment: sentiment,
      tokens,
      whaleMovements: [{
        wallet: '0x7a2...3f1c',
        action: bigMover.change24h > 0 ? 'BUY' : 'SELL',
        amount: `${(rng(seed+5) * 500 + 100).toFixed(0)} ${bigMover.symbol}`,
        token: bigMover.symbol,
        timestamp: '1 min ago',
      }],
    };
  }
}
