/**
 * Agent Arena MCP Server
 *
 * Implements the Model Context Protocol over HTTP (JSON-RPC 2.0).
 * Agents authenticate with Bearer: <agentId> and get access to
 * real OKX DEX tools on X Layer (chain 196).
 *
 * Tools:
 *   get_market       — live OKX prices + sentiment
 *   get_quote        — OKX DEX V6 swap quote (no execution)
 *   execute_swap     — real on-chain swap via agent wallet
 *   get_portfolio    — on-chain balances for the agent wallet
 *   get_positions    — competition standing + trade history
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMarketContext } from '@/lib/market-data';
import { getSwapQuote, executeSwap, getOnChainBalance, TOKENS } from '@/lib/okx-swap';

export const dynamic = 'force-dynamic';

// ── JSON-RPC helpers ───────────────────────────────────────────────────────────
const ok  = (id: unknown, result: unknown) => ({ jsonrpc: '2.0', id, result });
const err = (id: unknown, code: number, message: string) =>
  ({ jsonrpc: '2.0', id, error: { code, message } });

// ── Tool definitions (for initialize/tools/list) ───────────────────────────────
const TOOLS = [
  {
    name: 'get_market',
    description: 'Get live OKX market data: token prices, 24h changes, volume, whale movements, and overall sentiment.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_quote',
    description: 'Get a real OKX DEX V6 swap quote on X Layer. Returns expected output, price impact, and routing path. Does NOT execute.',
    inputSchema: {
      type: 'object',
      properties: {
        from_token:  { type: 'string', description: 'Token to sell: OKB | USDC | WETH | WBTC' },
        to_token:    { type: 'string', description: 'Token to buy:  OKB | USDC | WETH | WBTC' },
        amount_usd:  { type: 'number', description: 'USD value to swap' },
      },
      required: ['from_token', 'to_token', 'amount_usd'],
    },
  },
  {
    name: 'execute_swap',
    description: 'Execute a real on-chain token swap via OKX DEX on X Layer. Requires the competition to be live. Uses the agent\'s funded wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        from_token:     { type: 'string', description: 'Token to sell: OKB | USDC | WETH | WBTC' },
        to_token:       { type: 'string', description: 'Token to buy:  OKB | USDC | WETH | WBTC' },
        amount_usd:     { type: 'number', description: 'USD value to swap (max: available balance)' },
        competition_id: { type: 'string', description: 'Competition ID to record the trade against' },
        rationale:      { type: 'string', description: 'One-sentence reason for this trade' },
        dry_run:        { type: 'boolean', description: 'Simulate without executing (default: false)' },
      },
      required: ['from_token', 'to_token', 'amount_usd', 'competition_id', 'rationale'],
    },
  },
  {
    name: 'get_portfolio',
    description: 'Get the agent\'s on-chain token balances on X Layer and total portfolio value in USD.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_positions',
    description: 'Get the agent\'s current competition standing: portfolio value, PnL%, trade count, and recent trades.',
    inputSchema: {
      type: 'object',
      properties: {
        competition_id: { type: 'string', description: 'Competition ID to query (optional — returns all active competitions if omitted)' },
      },
      required: [],
    },
  },
];

// ── Auth ───────────────────────────────────────────────────────────────────────
async function resolveAgent(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  return prisma.agent.findUnique({ where: { id: token } });
}

// ── Tool handlers ──────────────────────────────────────────────────────────────
async function handleGetMarket() {
  const market = await getMarketContext();
  return {
    sentiment: market.overallSentiment,
    tokens: market.tokens.map(t => ({
      symbol:    t.symbol,
      price_usd: t.price,
      change_24h: t.change24h,
      volume_24h: t.volume24h,
      trend:      t.trend,
    })),
    whale_movements: market.whaleMovements,
  };
}

async function handleGetQuote(args: any) {
  const { from_token, to_token, amount_usd } = args;
  if (!TOKENS[from_token]) throw new Error(`Unknown from_token: ${from_token}`);
  if (!TOKENS[to_token])   throw new Error(`Unknown to_token: ${to_token}`);
  if (amount_usd <= 0)     throw new Error('amount_usd must be > 0');

  const quote = await getSwapQuote(from_token, to_token, amount_usd, '0x0000000000000000000000000000000000000000');
  return {
    from_token:    quote.fromToken,
    to_token:      quote.toToken,
    from_amount:   quote.fromAmount,
    to_amount:     quote.toAmount,
    price_impact:  `${quote.priceImpact.toFixed(4)}%`,
    route:         quote.dexPath,
    router:        quote.routerAddress,
    estimated_gas: quote.estimatedGas,
  };
}

async function handleExecuteSwap(args: any, agent: any) {
  const {
    from_token, to_token, amount_usd, competition_id, rationale,
    dry_run = false,
  } = args;

  if (!TOKENS[from_token]) throw new Error(`Unknown from_token: ${from_token}`);
  if (!TOKENS[to_token])   throw new Error(`Unknown to_token: ${to_token}`);
  if (amount_usd <= 0)     throw new Error('amount_usd must be > 0');

  // Verify competition is live and agent is enrolled
  const ca = await prisma.competitionAgent.findUnique({
    where: { competitionId_agentId: { competitionId: competition_id, agentId: agent.id } },
    include: { competition: true },
  });
  if (!ca)                          throw new Error('Agent not enrolled in this competition');
  if (ca.competition.status !== 'live') throw new Error('Competition is not live');

  // Check agent has a wallet private key stored
  const walletKey = (agent as any).walletKey;
  if (!walletKey && !dry_run) {
    throw new Error('Agent wallet not funded — cannot execute real swap. Use dry_run: true to simulate.');
  }

  // Execute (or simulate)
  const result = await executeSwap(
    from_token, to_token, amount_usd,
    walletKey ?? '0x0000000000000000000000000000000000000000000000000000000000000001',
    dry_run || !walletKey
  );

  if (!result.success) throw new Error(result.error ?? 'Swap failed');

  // Record the trade
  const pair        = `${from_token} → ${to_token}`;
  const priceImpact = `${result.priceImpact > 0 ? '-' : '+'}${(result.priceImpact * 100).toFixed(2)}%`;

  // Update portfolio — use actual on-chain values if real swap, else estimate
  const pnlChange = result.dryRun
    ? (result.toAmount - amount_usd) * 0.01  // tiny simulation delta
    : 0; // real swap: portfolio updated via getPortfolio on next tick

  const newPortfolio = Math.max(0, ca.portfolio + pnlChange);
  const newPnlPct    = ((newPortfolio - ca.startingPortfolio) / ca.startingPortfolio) * 100;

  await prisma.$transaction([
    prisma.trade.create({
      data: {
        competitionId: competition_id,
        agentId:       agent.id,
        type:          from_token === 'USDC' ? 'BUY' : 'SELL',
        pair,
        amount:        `${amount_usd.toFixed(2)} ${from_token}`,
        amountUsd:     amount_usd,
        rationale,
        priceImpact,
      },
    }),
    prisma.competitionAgent.update({
      where: { id: ca.id },
      data: {
        portfolio: newPortfolio,
        pnlPct:    newPnlPct,
        trades:    ca.trades + 1,
      },
    }),
    prisma.competition.update({
      where: { id: competition_id },
      data:  { volumeUsd: { increment: amount_usd } },
    }),
  ]);

  // Publish to signal marketplace
  await prisma.signal.create({
    data: {
      agentId:       agent.id,
      competitionId: competition_id,
      tradeType:     from_token === 'USDC' ? 'BUY' : 'SELL',
      pair,
      rationale,
      priceAtSignal: result.fromAmount,
      priceUsd:      1,
    },
  }).catch(() => {});

  return {
    success:       true,
    dry_run:       !!result.dryRun,
    tx_hash:       result.txHash ?? null,
    from_token,
    to_token,
    from_amount:   result.fromAmount,
    to_amount:     result.toAmount,
    price_impact:  priceImpact,
    gas_used:      result.gasUsed ?? null,
    trade_recorded: true,
  };
}

async function handleGetPortfolio(agent: any) {
  const address = agent.wallet as `0x${string}`;
  const market  = await getMarketContext();
  const prices  = Object.fromEntries(market.tokens.map(t => [t.symbol, t.price]));

  const balances: Record<string, number> = {};
  let totalUsd = 0;

  for (const symbol of Object.keys(TOKENS)) {
    const bal = await getOnChainBalance(address, symbol);
    balances[symbol] = bal;
    totalUsd += symbol === 'USDC' ? bal : bal * (prices[symbol] ?? 0);
  }

  return {
    wallet_address: address,
    balances,
    total_usd:      parseFloat(totalUsd.toFixed(4)),
    prices,
  };
}

async function handleGetPositions(args: any, agent: any) {
  const { competition_id } = args ?? {};

  const where: any = { agentId: agent.id };
  if (competition_id) where.competitionId = competition_id;

  const positions = await prisma.competitionAgent.findMany({
    where,
    include: {
      competition: { select: { id: true, title: true, status: true } },
    },
  });

  const trades = competition_id
    ? await prisma.trade.findMany({
        where:   { agentId: agent.id, competitionId: competition_id },
        orderBy: { timestamp: 'desc' },
        take:    10,
      })
    : [];

  return {
    positions: positions.map(p => ({
      competition_id:    p.competitionId,
      competition_title: p.competition.title,
      status:            p.competition.status,
      portfolio_usd:     parseFloat(p.portfolio.toFixed(4)),
      pnl_pct:           parseFloat(p.pnlPct.toFixed(4)),
      trades:            p.trades,
      score:             p.score,
    })),
    recent_trades: trades.map(t => ({
      type:        t.type,
      pair:        t.pair,
      amount:      t.amount,
      rationale:   t.rationale,
      price_impact: t.priceImpact,
      timestamp:   t.timestamp,
    })),
  };
}

// ── Main handler ───────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const agent = await resolveAgent(req);
  if (!agent) {
    return NextResponse.json(err(null, -32001, 'Unauthorized: Bearer <agentId> required'), { status: 401 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json(err(null, -32700, 'Parse error'), { status: 400 }); }

  const { jsonrpc, method, params, id } = body;
  if (jsonrpc !== '2.0') return NextResponse.json(err(id, -32600, 'Invalid JSON-RPC version'));

  try {
    // ── MCP lifecycle methods ──
    if (method === 'initialize') {
      return NextResponse.json(ok(id, {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'agent-arena-mcp', version: '1.0.0' },
        capabilities: { tools: {} },
      }));
    }

    if (method === 'notifications/initialized') {
      return NextResponse.json({ jsonrpc: '2.0', id: null }); // ack
    }

    if (method === 'tools/list') {
      return NextResponse.json(ok(id, { tools: TOOLS }));
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params ?? {};
      let result: unknown;

      switch (name) {
        case 'get_market':    result = await handleGetMarket();                    break;
        case 'get_quote':     result = await handleGetQuote(args);                 break;
        case 'execute_swap':  result = await handleExecuteSwap(args, agent);       break;
        case 'get_portfolio': result = await handleGetPortfolio(agent);             break;
        case 'get_positions': result = await handleGetPositions(args, agent);      break;
        default:              return NextResponse.json(err(id, -32601, `Unknown tool: ${name}`));
      }

      return NextResponse.json(ok(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }));
    }

    return NextResponse.json(err(id, -32601, `Method not found: ${method}`));
  } catch (e: any) {
    console.error('[MCP] handler error:', e.message);
    return NextResponse.json(err(id, -32603, e.message ?? 'Internal error'));
  }
}

// SSE transport for streaming (GET endpoint)
export async function GET(req: Request) {
  const agent = await resolveAgent(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return new Response(
    `event: endpoint\ndata: ${JSON.stringify({ endpoint: '/api/mcp', transport: 'http' })}\n\n`,
    { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
  );
}
