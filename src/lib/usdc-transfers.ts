import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  parseAbi,
  parseAbiItem,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  ARENA_WALLET_ADDRESS,
  getXLayerConfig,
  usdcFromBaseUnits,
  usdcToBaseUnits,
  type XLayerArenaNetwork,
} from './xlayer-config';

const ERC20_TRANSFER_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
]);

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

function publicClientFor(network: XLayerArenaNetwork) {
  const config = getXLayerConfig(network);
  return createPublicClient({
    chain: config.wagmiChain,
    transport: http(config.rpcUrl),
  });
}

function arenaWalletClientFor(network: XLayerArenaNetwork) {
  const key = process.env.ARENA_WALLET_PRIVATE_KEY;
  if (!key || !key.startsWith('0x') || key.length !== 66) return null;

  const config = getXLayerConfig(network);
  const account = privateKeyToAccount(key as `0x${string}`);
  return createWalletClient({
    account,
    chain: config.wagmiChain,
    transport: http(config.rpcUrl),
  });
}

export type VerifiedUsdcTransfer = {
  txHash: Hash;
  from: Address;
  to: Address;
  amountBaseUnits: bigint;
  amountUsdc: number;
  network: XLayerArenaNetwork;
  tokenAddress: Address;
  blockNumber: bigint;
};

export async function verifyUsdcTransferReceipt({
  txHash,
  expectedFrom,
  minAmountUsdc,
  expectedTo = ARENA_WALLET_ADDRESS,
  network = 'testnet',
}: {
  txHash: string;
  expectedFrom: string;
  minAmountUsdc: number;
  expectedTo?: Address;
  network?: XLayerArenaNetwork;
}): Promise<
  | { ok: true; transfer: VerifiedUsdcTransfer }
  | { ok: false; error: string }
> {
  try {
    const config = getXLayerConfig(network);
    const client = publicClientFor(network);
    const receipt = await client.getTransactionReceipt({ hash: txHash as Hash });

    if (receipt.status !== 'success') {
      return { ok: false, error: 'USDC transaction failed on-chain' };
    }

    const tx = await client.getTransaction({ hash: txHash as Hash });
    if (!tx.to || tx.to.toLowerCase() !== config.usdcAddress.toLowerCase()) {
      return { ok: false, error: 'Transaction was not sent to the X Layer USDC contract' };
    }

    const minAmountBaseUnits = usdcToBaseUnits(minAmountUsdc);
    const normalizedFrom = expectedFrom.toLowerCase();
    const normalizedTo = expectedTo.toLowerCase();

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== config.usdcAddress.toLowerCase()) continue;

      try {
        const decoded = decodeEventLog({
          abi: [TRANSFER_EVENT],
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName !== 'Transfer') continue;

        const from = decoded.args.from as Address;
        const to = decoded.args.to as Address;
        const value = decoded.args.value as bigint;

        if (from.toLowerCase() !== normalizedFrom) continue;
        if (to.toLowerCase() !== normalizedTo) continue;
        if (value < minAmountBaseUnits) continue;

        return {
          ok: true,
          transfer: {
            txHash: txHash as Hash,
            from,
            to,
            amountBaseUnits: value,
            amountUsdc: usdcFromBaseUnits(value),
            network,
            tokenAddress: config.usdcAddress,
            blockNumber: receipt.blockNumber,
          },
        };
      } catch {
        continue;
      }
    }

    return {
      ok: false,
      error: 'Could not find a matching USDC transfer to the arena wallet in that transaction',
    };
  } catch (error: any) {
    const message = error?.shortMessage || error?.message || 'USDC receipt verification failed';
    if (String(message).includes('not found')) {
      return { ok: false, error: 'Transaction not found on X Layer yet. Wait a few seconds and retry.' };
    }
    return { ok: false, error: message };
  }
}

export async function sendArenaUsdc({
  toAddress,
  amountUsdc,
  network = 'testnet',
}: {
  toAddress: string;
  amountUsdc: number;
  network?: XLayerArenaNetwork;
}): Promise<
  | { ok: true; txHash: Hash }
  | { ok: false; error: string }
> {
  const client = arenaWalletClientFor(network);
  if (!client) {
    return {
      ok: false,
      error: 'ARENA_WALLET_PRIVATE_KEY is missing or invalid',
    };
  }

  try {
    const config = getXLayerConfig(network);
    const txHash = await client.writeContract({
      address: config.usdcAddress,
      abi: ERC20_TRANSFER_ABI,
      functionName: 'transfer',
      args: [toAddress as Address, usdcToBaseUnits(amountUsdc)],
    });

    const publicClient = publicClientFor(network);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { ok: true, txHash };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.shortMessage || error?.message || 'USDC transfer failed',
    };
  }
}
