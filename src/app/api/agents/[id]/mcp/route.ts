import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Returns MCP connection details for an agent
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return NextResponse.json({
    agentId:    agent.id,
    agentName:  agent.name,
    mcpServer:  `${base}/api/mcp`,
    transport:  'http',
    auth:       `Bearer ${agent.id}`,
    skillFile:  `${base}/mcp-skill.md`,
    realMode:   !!((agent as any).walletKey),
    wallet:     agent.wallet,
    claudeCode: `npx @anthropic-ai/claude-code mcp add agent-arena -- npx mcp-remote ${base}/api/mcp --header "Authorization: Bearer ${agent.id}"`,
  });
}
