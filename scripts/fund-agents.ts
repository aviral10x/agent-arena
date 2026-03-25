/**
 * Fund agent wallets with testnet OKB from the arena relayer wallet.
 * Run: npx tsx scripts/fund-agents.ts
 */
import { createPublicClient, createWalletClient, http, formatUnits, parseEther, parseGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/vaibu/agent-arena/.env', override: true });

const xLayerTestnet = defineChain({
  id: 1952,  // actual chain ID from eth_chainId (0x7a0)
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://testrpc.xlayer.tech'] } },
  blockExplorers: { default: { name: 'OKLink Testnet', url: 'https://www.oklink.com/xlayer-test' } },
  testnet: true,
});

const FUND_AMOUNT = parseEther('0.04'); // 0.04 OKB per agent
const MIN_BALANCE = parseEther('0.005');

async function main() {
  const funderKey = process.env.ARENA_WALLET_PRIVATE_KEY as `0x${string}`;
  if (!funderKey || !funderKey.startsWith('0x')) throw new Error('ARENA_WALLET_PRIVATE_KEY not set');

  const funder = privateKeyToAccount(funderKey);
  const pub = createPublicClient({ chain: xLayerTestnet, transport: http('https://testrpc.xlayer.tech') });
  const wallet = createWalletClient({ account: funder, chain: xLayerTestnet, transport: http('https://testrpc.xlayer.tech') });

  const funderBal = await pub.getBalance({ address: funder.address });
  console.log(`\n💰 Funder: ${funder.address}`);
  console.log(`   Balance: ${formatUnits(funderBal, 18)} OKB\n`);

  const prisma = new PrismaClient();
  const agents = await prisma.agent.findMany({
    where: { walletKey: { not: null } },
    select: { id: true, name: true, wallet: true },
  });

  console.log(`🤖 ${agents.length} agents to fund\n`);

  for (const agent of agents) {
    const addr = agent.wallet as `0x${string}`;
    if (!addr.startsWith('0x') || addr.length !== 42) {
      console.log(`⚠️  ${agent.name} — invalid address: ${addr}`);
      continue;
    }

    const bal = await pub.getBalance({ address: addr });
    if (bal >= MIN_BALANCE) {
      console.log(`✅ ${agent.name} — ${formatUnits(bal, 18)} OKB (already funded)`);
      continue;
    }

    console.log(`📤 Funding ${agent.name} (${addr})...`);
    try {
      // Get current gas price
      const gasPrice = await pub.getGasPrice();

      // Use pending nonce to handle back-to-back txs
      const nonce = await pub.getTransactionCount({ address: funder.address, blockTag: 'pending' });
      const hash = await wallet.sendTransaction({
        to: addr,
        value: FUND_AMOUNT,
        nonce,
        gas: BigInt(21000),
        gasPrice,
        type: 'legacy',
      });

      console.log(`   TX hash: ${hash}`);
      console.log(`   Explorer: https://www.oklink.com/xlayer-test/tx/${hash}`);
      const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
      console.log(`   ✓ Confirmed! Status: ${receipt.status}`);

      const newBal = await pub.getBalance({ address: addr });
      console.log(`   New balance: ${formatUnits(newBal, 18)} OKB\n`);
    } catch (err: any) {
      console.error(`   ❌ ${err.message?.slice(0, 200)}\n`);
    }
  }

  await prisma.$disconnect();
  console.log('Done!');
}

main().catch(console.error);
