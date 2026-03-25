/**
 * Quick balance checker — shows what funds are available on X Layer
 * for the arena relayer wallet and any test agent wallets.
 * 
 * Usage: npx tsx scripts/check-balances.ts
 */

import { createPublicClient, http, formatUnits, parseAbi } from 'viem';
import { xLayer } from 'wagmi/chains';
import dotenv from 'dotenv';

dotenv.config();

const publicClient = createPublicClient({
  chain: xLayer,
  transport: http(process.env.XLAYER_RPC_URL ?? 'https://rpc.xlayer.tech'),
});

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
]);

const USDC_ADDRESS = '0x74b7f16337b8972027f6196a17a631ac6de26d22' as `0x${string}`;

async function checkBalance(label: string, address: `0x${string}`) {
  try {
    // Native OKB balance
    const okbBalance = await publicClient.getBalance({ address });
    const okbFormatted = formatUnits(okbBalance, 18);

    // USDC balance
    let usdcFormatted = '0';
    try {
      const usdcBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      usdcFormatted = formatUnits(usdcBalance, 6);
    } catch {
      usdcFormatted = 'error';
    }

    console.log(`\n${label}: ${address}`);
    console.log(`  OKB (gas):  ${parseFloat(okbFormatted).toFixed(6)} OKB`);
    console.log(`  USDC:       ${parseFloat(usdcFormatted).toFixed(2)} USDC`);

    return {
      okb: parseFloat(okbFormatted),
      usdc: parseFloat(usdcFormatted),
    };
  } catch (err: any) {
    console.log(`\n${label}: ${address}`);
    console.log(`  ERROR: ${err.message?.slice(0, 100)}`);
    return { okb: 0, usdc: 0 };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Agent Arena — X Layer Balance Check');
  console.log('  Chain: X Layer (196)');
  console.log('═══════════════════════════════════════════');

  // 1. Arena relayer wallet
  const arenaWallet = process.env.ARENA_WALLET_ADDRESS as `0x${string}`;
  if (arenaWallet) {
    const arena = await checkBalance('🏟️  Arena Relayer Wallet', arenaWallet);
    
    console.log('\n── Requirements Check ──');
    console.log(`  Gas (OKB):   ${arena.okb >= 0.01 ? '✅' : '❌'} Need ≥0.01 OKB (have ${arena.okb.toFixed(6)})`);
    console.log(`  USDC:        ${arena.usdc >= 0 ? '✅' : '❌'} Relayer doesn't need USDC (receives from users)`);
  } else {
    console.log('\n❌ ARENA_WALLET_ADDRESS not set in .env');
  }

  // 2. Check OKX API connectivity
  console.log('\n── OKX API Check ──');
  try {
    const res = await fetch('https://www.okx.com/api/v5/public/time');
    const data = await res.json();
    if (data.code === '0') {
      console.log('  OKX API:     ✅ Connected');
    } else {
      console.log(`  OKX API:     ❌ Error: ${data.msg}`);
    }
  } catch (err: any) {
    console.log(`  OKX API:     ❌ ${err.message?.slice(0, 80)}`);
  }

  // 3. Check X Layer RPC
  console.log('\n── X Layer RPC Check ──');
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`  RPC:         ✅ Block #${blockNumber}`);
  } catch (err: any) {
    console.log(`  RPC:         ❌ ${err.message?.slice(0, 80)}`);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  Minimum funds to test full on-chain flow:');
  console.log('  • Your MetaMask/OKX wallet: ~$5 USDC + 0.01 OKB (X Layer)');
  console.log('  • Arena relayer wallet: 0.01 OKB for gas');
  console.log('  • Agent wallets are auto-funded from simulation');
  console.log('  Note: Agent wallets need USDC + OKB for REAL swaps');
  console.log('═══════════════════════════════════════════\n');
}

main().catch(console.error);
