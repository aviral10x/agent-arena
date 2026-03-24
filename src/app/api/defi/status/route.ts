import { NextResponse } from 'next/server';
import { getProtocolStatus, PROTOCOLS, XLAYER_TOKENS } from '@/lib/defi-xlayer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await getProtocolStatus();

  return NextResponse.json({
    chain: { id: 196, name: 'X Layer', rpc: 'https://rpc.xlayer.tech' },
    tokens: Object.values(XLAYER_TOKENS),
    protocols: Object.entries(PROTOCOLS).map(([key, proto]) => ({
      key,
      name:        proto.name,
      type:        proto.type,
      address:     proto.address,
      live:        status[key]?.live ?? false,
      bytecodeSize: status[key]?.bytecodeSize ?? 0,
    })),
    mcpTools: [
      'get_market', 'get_quote', 'execute_swap', 'get_portfolio', 'get_positions',
      'get_protocols', 'aave_position', 'aave_supply', 'aave_withdraw', 'aave_borrow',
    ],
    mcpEndpoint: '/api/mcp',
    mcpAuth: 'Bearer <agentId>',
    skillFile: '/mcp-skill.md',
  });
}
