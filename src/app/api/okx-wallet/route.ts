import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

const ONCHAINOS = `${process.env.HOME}/.local/bin/onchainos`;
const XLAYER_CHAIN = '196';

function run(cmd: string): any {
  try {
    const out = execSync(`${ONCHAINOS} ${cmd}`, {
      timeout: 15000,
      encoding: 'utf-8',
      env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` },
    });
    return JSON.parse(out);
  } catch (err: any) {
    console.error('[okx-wallet]', err.message?.slice(0, 120));
    return { ok: false, error: err.message?.slice(0, 200) };
  }
}

// GET /api/okx-wallet — wallet status + X Layer address
export async function GET() {
  const status = run('wallet status');
  if (!status?.ok || !status?.data?.loggedIn) {
    return NextResponse.json({ loggedIn: false, address: null });
  }

  const addrs = run('wallet addresses --chain 196');
  const xlayerAddr = addrs?.data?.xlayer?.[0]?.address
    ?? addrs?.data?.evm?.[0]?.address
    ?? null;

  return NextResponse.json({
    loggedIn: true,
    accountId: status.data.currentAccountId,
    accountName: status.data.currentAccountName,
    address: xlayerAddr,
    chain: 'X Layer',
    chainId: 196,
  });
}

// POST /api/okx-wallet — sign EIP-712 message for x402 payment
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'sign-eip712') {
      const { message, from } = body;
      if (!message || !from) {
        return NextResponse.json({ error: 'message and from required' }, { status: 400 });
      }

      // Use onchainos to sign via TEE
      const msgJson = typeof message === 'string' ? message : JSON.stringify(message);
      // Escape for shell
      const escaped = msgJson.replace(/'/g, "'\\''");
      const result = run(`wallet sign-message --chain ${XLAYER_CHAIN} --from ${from} --type eip712 --message '${escaped}'`);

      if (!result?.ok) {
        return NextResponse.json({ error: result?.error ?? 'Signing failed' }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        signature: result.data?.signature ?? result.data?.value,
        from,
      });
    }

    if (action === 'balance') {
      const result = run(`wallet balance --chain ${XLAYER_CHAIN}`);
      return NextResponse.json(result?.data ?? { totalValueUsd: '0' });
    }

    if (action === 'send') {
      const { to, amt, tokenAddress } = body;
      const tokenFlag = tokenAddress ? `--token-address ${tokenAddress}` : '';
      const result = run(`wallet send --chain ${XLAYER_CHAIN} --to ${to} --amt ${amt} ${tokenFlag}`);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
