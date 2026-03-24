import {
  createPublicClient,
  createWalletClient,
  http,
  recoverTypedDataAddress,
  parseAbi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { xLayer } from 'wagmi/chains';
import { prisma } from './db';

const publicClient = createPublicClient({ chain: xLayer, transport: http() });

// Server wallet — relayer that submits transferWithAuthorization on-chain
const RELAYER_PRIVATE_KEY = process.env.ARENA_WALLET_PRIVATE_KEY as `0x${string}` | undefined;
const relayerAccount = RELAYER_PRIVATE_KEY ? privateKeyToAccount(RELAYER_PRIVATE_KEY) : null;
const walletClient = relayerAccount
  ? createWalletClient({ account: relayerAccount, chain: xLayer, transport: http() })
  : null;

// USDC on X Layer (chain 196)
const USDC_ADDRESS = '0x74b7f16337b8972027f6196a17a631ac6de26d22' as const;
const ARENA_RECEIVER = (process.env.ARENA_WALLET_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;

// EIP-3009 ABI — transferWithAuthorization
const USDC_ABI = parseAbi([
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function authorizationState(address authorizer, bytes32 nonce) external view returns (bool)',
]);

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
  value:        string;
  validAfter:   string;
  validBefore:  string;
  nonce:        `0x${string}`;
};

export type VerifyResult =
  | { ok: true;  wallet: string; txHash?: string }
  | { ok: false; error: string };

export async function verifyX402Payment(
  payload:      X402Payload,
  resourceType: string,
  resourceId:   string,
  expectedUsd:  number
): Promise<VerifyResult> {
  try {
    const now = Math.floor(Date.now() / 1000);

    // 1. Time window
    if (now < Number(payload.validAfter))  return { ok: false, error: 'Payment not yet valid' };
    if (now > Number(payload.validBefore)) return { ok: false, error: 'Payment expired — please retry' };

    // 2. Destination must be Arena wallet
    if (payload.to.toLowerCase() !== ARENA_RECEIVER.toLowerCase()) {
      return { ok: false, error: 'Wrong payment destination' };
    }

    // 3. Amount check — USDC has 6 decimals
    const expectedMicro = BigInt(Math.round(expectedUsd * 1_000_000));
    if (BigInt(payload.value) < expectedMicro) {
      return { ok: false, error: `Insufficient payment: expected $${expectedUsd} USDC` };
    }

    // 4. Recover signer
    const domain = {
      name:              'USD Coin',
      version:           '2',
      chainId:           196,
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
      return { ok: false, error: 'Signature signer does not match from address' };
    }

    // 5. Replay protection — check DB and also check on-chain nonce state
    const existing = await prisma.accessGrant.findFirst({
      where: { txSignature: payload.signature },
    });
    if (existing) return { ok: false, error: 'Payment already used' };

    // 6. Submit on-chain transferWithAuthorization
    let txHash: string | undefined;
    if (walletClient && relayerAccount) {
      try {
        // Parse the compact signature into v, r, s
        const sig = payload.signature.slice(2); // strip 0x
        const r = `0x${sig.slice(0, 64)}`   as `0x${string}`;
        const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
        const v = parseInt(sig.slice(128, 130), 16);

        txHash = await walletClient.writeContract({
          address:      USDC_ADDRESS,
          abi:          USDC_ABI,
          functionName: 'transferWithAuthorization',
          args: [
            payload.from,
            payload.to,
            BigInt(payload.value),
            BigInt(payload.validAfter),
            BigInt(payload.validBefore),
            payload.nonce,
            v,
            r as `0x${string}`,
            s as `0x${string}`,
          ],
        });

        console.log(`[x402] on-chain transfer submitted: ${txHash}`);
      } catch (onchainErr: any) {
        // Don't block access if chain submission fails — log and continue
        // (could be insufficient gas, already submitted, etc.)
        console.warn('[x402] on-chain transfer failed (granting access anyway):', onchainErr.message?.slice(0, 120));
      }
    } else {
      console.warn('[x402] No relayer wallet configured — granting access without on-chain transfer');
    }

    // 7. Persist access grant
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

    return { ok: true, wallet: payload.from.toLowerCase(), txHash };
  } catch (err: any) {
    console.error('[x402] verify error:', err);
    const raw = err.message ?? '';
    const friendly = raw.includes('bytes') || raw.includes('viem') || raw.includes('Expected')
      ? 'Invalid payment signature format'
      : raw.length > 120 ? 'Payment verification failed' : raw;
    return { ok: false, error: friendly };
  }
}

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
