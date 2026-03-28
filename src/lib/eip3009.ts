import type { Address } from 'viem';
import { ARENA_WALLET_ADDRESS, getXLayerConfig, usdcToBaseUnits, type XLayerArenaNetwork } from './xlayer-config';

export const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

export type X402Payload = {
  signature: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: `0x${string}`;
};

export function buildTransferWithAuthorizationTypedData({
  from,
  amountUsdc,
  nonce,
  validAfter = 0,
  validBefore = Math.floor(Date.now() / 1000) + 300,
  to = ARENA_WALLET_ADDRESS,
  network = 'testnet',
}: {
  from: Address;
  amountUsdc: number;
  nonce: `0x${string}`;
  validAfter?: number;
  validBefore?: number;
  to?: Address;
  network?: XLayerArenaNetwork;
}) {
  const config = getXLayerConfig(network);

  return {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      TransferWithAuthorization: [...EIP3009_TYPES.TransferWithAuthorization],
    },
    primaryType: 'TransferWithAuthorization' as const,
    domain: {
      name: 'USD Coin',
      version: '2',
      chainId: config.chainId,
      verifyingContract: config.usdcAddress,
    },
    message: {
      from,
      to,
      value: usdcToBaseUnits(amountUsdc).toString(),
      validAfter: String(validAfter),
      validBefore: String(validBefore),
      nonce,
    },
  };
}

