'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSignTypedData, useAccount } from 'wagmi';

// USDC on X Layer (chain 196)
const USDC_ADDRESS = '0x74b7f16337b8972027f6196a17a631ac6de26d22' as const;

type PaymentState = 'idle' | 'awaiting_wallet' | 'signing' | 'verifying' | 'success' | 'error';

export function useX402Payment(resourceType: string, resourceId: string) {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [state,   setState]  = useState<PaymentState>('idle');
  const [errMsg,  setErrMsg] = useState<string>('');

  // On mount: check if wallet already has an active grant (avoids re-payment)
  useEffect(() => {
    if (!address || !resourceType || !resourceId) return;
    fetch(`/api/x402/verify?wallet=${address}&resourceType=${resourceType}&resourceId=${resourceId}`)
      .then(r => r.json())
      .then(data => { if (data.active) setState('success'); })
      .catch(() => {});
  }, [address, resourceType, resourceId]);

  const pay = useCallback(async (amountUsdc = 1): Promise<boolean> => {
    if (!isConnected || !address) {
      setErrMsg('Connect your wallet first.');
      setState('error');
      setTimeout(() => setState('idle'), 3000);
      return false;
    }

    setState('awaiting_wallet');
    setErrMsg('');

    try {
      const amountMicro    = BigInt(Math.round(amountUsdc * 1_000_000));
      const nonce          = crypto.randomUUID().replace(/-/g, '');
      const validBefore    = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 min window
      const arenaReceiver  = (process.env.NEXT_PUBLIC_ARENA_WALLET ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;

      const domain = {
        name:             'USD Coin',
        version:          '2',
        chainId:          196,
        verifyingContract: USDC_ADDRESS,
      };

      const types = {
        TransferWithAuthorization: [
          { name: 'from',        type: 'address' },
          { name: 'to',          type: 'address' },
          { name: 'value',       type: 'uint256' },
          { name: 'validAfter',  type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce',       type: 'bytes32' },
        ],
      } as const;

      const message = {
        from:        address,
        to:          arenaReceiver,
        value:       amountMicro,
        validAfter:  BigInt(0),
        validBefore,
        nonce:       `0x${nonce}` as `0x${string}`,
      };

      setState('signing');
      const signature = await signTypedDataAsync({ domain, types, primaryType: 'TransferWithAuthorization', message });

      // --- Server-side verification ---
      setState('verifying');
      const res = await fetch('/api/x402/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType,
          resourceId,
          payload: {
            signature,
            from:        address,
            to:          arenaReceiver,
            value:       amountMicro.toString(),
            validAfter:  '0',
            validBefore: validBefore.toString(),
            nonce:       `0x${nonce}`,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Payment verification failed');
      }

      setState('success');
      return true;
    } catch (err: any) {
      console.error('[x402]', err);
      setErrMsg(err.message ?? 'Payment failed');
      setState('error');
      setTimeout(() => setState('idle'), 4000);
      return false;
    }
  }, [address, isConnected, signTypedDataAsync, resourceType, resourceId]);

  return {
    pay,
    state,
    errMsg,
    isPending:  state === 'awaiting_wallet' || state === 'signing' || state === 'verifying',
    isSuccess:  state === 'success',
    isError:    state === 'error',
    reset:      () => { setState('idle'); setErrMsg(''); },
  };
}
