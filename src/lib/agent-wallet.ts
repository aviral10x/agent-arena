/**
 * Agent Wallet Service — OKX Agentic Wallet integration for AI agents
 *
 * All agents share the master OKX agentic wallet (TEE-backed).
 * The server signs x402 payments on behalf of agents for:
 *   - Match entry fees ($0.10 USDC per match)
 *   - Future: per-action costs during matches
 *
 * Agent-specific balances are tracked in the DB (agent.wallet field
 * stores the shared address, agent balance tracked via CompetitionAgent.portfolio).
 *
 * Prize payouts are received into the same master wallet and credited
 * to the winning agent's DB balance.
 */

import { execSync } from 'child_process';

const ONCHAINOS = `${process.env.HOME}/.local/bin/onchainos`;
const XLAYER_CHAIN = '196';
const USDC_ADDRESS = '0x74b7f16337b8972027f6196a17a631ac6de26d22';
const ARENA_RECEIVER = process.env.NEXT_PUBLIC_ARENA_WALLET ?? '0x991442af55370b91930c5617b472b0e468e97bb2';

// Cache the agentic wallet address
let _agentWalletAddress: string | null = null;

function runCli(cmd: string): any {
  try {
    const out = execSync(`${ONCHAINOS} ${cmd}`, {
      timeout: 15000,
      encoding: 'utf-8',
      env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` },
    });
    return JSON.parse(out);
  } catch (err: any) {
    console.error('[agent-wallet]', err.message?.slice(0, 120));
    return { ok: false, error: err.message?.slice(0, 200) };
  }
}

/**
 * Get the shared agentic wallet address (X Layer / EVM).
 * All agents use this address for on-chain operations.
 */
export async function getAgentWalletAddress(): Promise<string | null> {
  if (_agentWalletAddress) return _agentWalletAddress;

  const result = runCli('wallet addresses');
  if (!result?.ok) return null;

  const addr = result.data?.xlayer?.[0]?.address
    ?? result.data?.evm?.[0]?.address
    ?? null;

  if (addr) _agentWalletAddress = addr;
  return addr;
}

/**
 * Check if the agentic wallet is logged in and ready.
 */
export async function isAgentWalletReady(): Promise<boolean> {
  const result = runCli('wallet status');
  return result?.ok && result?.data?.loggedIn;
}

/**
 * Sign an EIP-712 x402 payment on behalf of an agent.
 * Used for match entry fees — the server signs without user interaction.
 *
 * @param amountUsdc — amount in USD (e.g. 0.10)
 * @param purpose — description for logging (e.g. "match entry cmn8xyz")
 * @returns x402 payload or null if signing fails
 */
export async function signAgentPayment(
  amountUsdc: number,
  purpose: string,
): Promise<{
  signature: string;
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
} | null> {
  const from = await getAgentWalletAddress();
  if (!from) {
    console.warn('[agent-wallet] No wallet address available for', purpose);
    return null;
  }

  const amountMicro = Math.round(amountUsdc * 1_000_000);
  const nonce = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex')}`;
  const validBefore = Math.floor(Date.now() / 1000) + 300; // 5 min window

  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    domain: {
      name: 'USD Coin',
      version: '2',
      chainId: 196,
      verifyingContract: USDC_ADDRESS,
    },
    message: {
      from,
      to: ARENA_RECEIVER,
      value: String(amountMicro),
      validAfter: '0',
      validBefore: String(validBefore),
      nonce,
    },
  };

  // Sign via TEE
  const msgJson = JSON.stringify(typedData).replace(/'/g, "'\\''");
  const result = runCli(
    `wallet sign-message --chain ${XLAYER_CHAIN} --from ${from} --type eip712 --message '${msgJson}' --force`
  );

  if (!result?.ok) {
    console.warn('[agent-wallet] Signing failed for', purpose, result?.error?.slice(0, 80));
    return null;
  }

  const signature = result.data?.signature ?? result.data?.value;
  if (!signature) {
    console.warn('[agent-wallet] No signature returned for', purpose);
    return null;
  }

  console.log(`[agent-wallet] Signed ${purpose}: $${amountUsdc} from ${from.slice(0, 8)}...`);

  return {
    signature,
    from,
    to: ARENA_RECEIVER,
    value: String(amountMicro),
    validAfter: '0',
    validBefore: String(validBefore),
    nonce,
  };
}

/**
 * Get the USDC balance of the agentic wallet on X Layer.
 */
export async function getAgentWalletBalance(): Promise<{ totalValueUsd: string; tokens: any[] }> {
  const result = runCli(`wallet balance --chain ${XLAYER_CHAIN}`);
  return {
    totalValueUsd: result?.data?.totalValueUsd ?? '0',
    tokens: result?.data?.details?.[0]?.tokenAssets ?? [],
  };
}

/**
 * Transfer USDC from the agentic wallet to a recipient.
 * Used for prize payouts to winner's wallet.
 *
 * @param toAddress — recipient wallet address
 * @param amountUsdc — amount in USD
 * @param purpose — description for logging
 */
export async function transferUsdc(
  toAddress: string,
  amountUsdc: number,
  purpose: string,
): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  const amountMicro = Math.round(amountUsdc * 1_000_000);

  const result = runCli(
    `wallet send --chain ${XLAYER_CHAIN} --receipt ${toAddress} --amt ${amountMicro} --contract-token ${USDC_ADDRESS} --force`
  );

  if (result?.ok) {
    const txHash = result.data?.txHash ?? result.data?.orderId ?? 'unknown';
    console.log(`[agent-wallet] Transfer ${purpose}: $${amountUsdc} → ${toAddress.slice(0, 8)}... tx=${txHash}`);
    return { ok: true, txHash };
  }

  console.warn(`[agent-wallet] Transfer failed for ${purpose}:`, result?.error?.slice(0, 100));
  return { ok: false, error: result?.error ?? 'Transfer failed' };
}
