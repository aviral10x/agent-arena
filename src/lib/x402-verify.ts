import { createPublicClient, http, recoverTypedDataAddress } from 'viem';
import { xLayer } from 'wagmi/chains';
import { prisma } from './db';

const client = createPublicClient({ chain: xLayer, transport: http() });

// USDC contract on X Layer (chain 196)
const USDC_ADDRESS = '0x74b7f16337b8972027f6196a17a631ac6de26d22' as const;
const ARENA_RECEIVER = (process.env.ARENA_WALLET_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;

// EIP-3009 domain + types (mirrors what use-x402.ts signs)
const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: 'from',        type: 'address' },
    { name: 'to',          type: 'address' },
    { name: 'value',       type: 'uint256' },
    { name: 'validAfter',  type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce',       type: 'bytes32' },
  ],
} as const;

export type X402Payload = {
  signature:    `0x${string}`;
  from:         `0x${string}`;
  to:           `0x${string}`;
  value:        string;       // uint256 as string
  validAfter:   string;
  validBefore:  string;
  nonce:        `0x${string}`;
};

export type VerifyResult =
  | { ok: true;  wallet: string }
  | { ok: false; error: string };

export async function verifyX402Payment(
  payload:      X402Payload,
  resourceType: string,
  resourceId:   string,
  expectedUsd:  number
): Promise<VerifyResult> {
  try {
    const now = Math.floor(Date.now() / 1000);

    // 1. Time window check
    if (now < Number(payload.validAfter))  return { ok: false, error: 'Payment not yet valid' };
    if (now > Number(payload.validBefore)) return { ok: false, error: 'Payment expired' };

    // 2. Destination must be Arena wallet
    if (payload.to.toLowerCase() !== ARENA_RECEIVER.toLowerCase()) {
      return { ok: false, error: 'Wrong payment destination' };
    }

    // 3. Amount check — USDC has 6 decimals
    const expectedMicro = BigInt(Math.round(expectedUsd * 1_000_000));
    if (BigInt(payload.value) < expectedMicro) {
      return { ok: false, error: `Insufficient payment: expected $${expectedUsd}` };
    }

    // 4. Recover signer from EIP-712 typed data
    const domain = {
      name:             'USD Coin',
      version:          '2',
      chainId:          196,
      verifyingContract: USDC_ADDRESS,
    };

    const message = {
      from:        payload.from,
      to:          payload.to,
      value:       BigInt(payload.value),
      validAfter:  BigInt(payload.validAfter),
      validBefore: BigInt(payload.validBefore),
      nonce:       payload.nonce,
    };

    const recovered = await recoverTypedDataAddress({
      domain,
      types:       EIP3009_TYPES,
      primaryType: 'TransferWithAuthorization',
      message,
      signature:   payload.signature,
    });

    if (recovered.toLowerCase() !== payload.from.toLowerCase()) {
      return { ok: false, error: 'Signature mismatch' };
    }

    // 5. Replay protection — signature must not have been used before
    const existing = await prisma.accessGrant.findFirst({
      where: { txSignature: payload.signature },
    });
    if (existing) return { ok: false, error: 'Signature already used' };

    // 6. Persist the grant (TTL: 24h for leaderboard, 7 days for replay/signal)
    const ttlHours = resourceType === 'leaderboard' ? 24 : 24 * 7;
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);

    await prisma.accessGrant.upsert({
      where: {
        walletAddress_resourceType_resourceId: {
          walletAddress: payload.from.toLowerCase(),
          resourceType,
          resourceId,
        },
      },
      update: { expiresAt, txSignature: payload.signature },
      create: {
        walletAddress: payload.from.toLowerCase(),
        resourceType,
        resourceId,
        txSignature:   payload.signature,
        amountUsd:     expectedUsd,
        expiresAt,
      },
    });

    return { ok: true, wallet: payload.from.toLowerCase() };
  } catch (err: any) {
    console.error('[x402] verify error:', err);
    return { ok: false, error: err.message ?? 'Verification failed' };
  }
}

// Check if a wallet already has a valid (non-expired) grant
export async function hasActiveGrant(
  walletAddress: string,
  resourceType:  string,
  resourceId:    string
): Promise<boolean> {
  const grant = await prisma.accessGrant.findUnique({
    where: {
      walletAddress_resourceType_resourceId: {
        walletAddress: walletAddress.toLowerCase(),
        resourceType,
        resourceId,
      },
    },
  });
  if (!grant) return false;
  return grant.expiresAt > new Date();
}
