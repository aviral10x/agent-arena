'use client';

import { useState, useEffect, useCallback } from 'react';

type OkxWalletState = {
  loggedIn: boolean;
  address: string | null;
  source: 'extension' | 'agentic' | null; // which wallet is connected
  loading: boolean;
};

/**
 * Hook for OKX Wallet — prefers browser extension (window.okxwallet),
 * falls back to server-side agentic wallet (onchainos CLI).
 */
export function useOkxWallet() {
  const [state, setState] = useState<OkxWalletState>({
    loggedIn: false,
    address: null,
    source: null,
    loading: true,
  });

  // Check for OKX browser extension first, then server-side agentic wallet
  useEffect(() => {
    const init = async () => {
      // 1. Try OKX browser extension
      const okx = (window as any).okxwallet;
      if (okx) {
        try {
          const accounts = await okx.request({ method: 'eth_requestAccounts' });
          if (accounts?.[0]) {
            setState({ loggedIn: true, address: accounts[0], source: 'extension', loading: false });
            return;
          }
        } catch {
          // Extension present but user rejected — fall through
        }
      }

      // 2. Fall back to server-side agentic wallet
      try {
        const res = await fetch('/api/okx-wallet');
        const data = await res.json();
        if (data.loggedIn && data.address) {
          setState({ loggedIn: true, address: data.address, source: 'agentic', loading: false });
          return;
        }
      } catch {}

      setState(s => ({ ...s, loading: false }));
    };
    init();
  }, []);

  // Connect OKX extension (if user hasn't connected yet)
  const connect = useCallback(async (): Promise<string | null> => {
    const okx = (window as any).okxwallet;
    if (!okx) {
      window.open('https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge', '_blank');
      return null;
    }
    try {
      const accounts = await okx.request({ method: 'eth_requestAccounts' });
      if (accounts?.[0]) {
        setState({ loggedIn: true, address: accounts[0], source: 'extension', loading: false });
        return accounts[0];
      }
    } catch {}
    return null;
  }, []);

  // Sign an EIP-712 message — extension or server-side
  const signEip712 = useCallback(async (typedData: object): Promise<string | null> => {
    if (!state.address) return null;

    // Extension path (client-side, instant)
    if (state.source === 'extension') {
      const okx = (window as any).okxwallet;
      if (okx) {
        try {
          const sig = await okx.request({
            method: 'eth_signTypedData_v4',
            params: [state.address, JSON.stringify(typedData)],
          });
          return sig;
        } catch { return null; }
      }
    }

    // Server-side agentic wallet (TEE signing)
    try {
      const res = await fetch('/api/okx-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign-eip712', message: typedData, from: state.address }),
      });
      const data = await res.json();
      return data.ok ? data.signature : null;
    } catch {
      return null;
    }
  }, [state.address, state.source]);

  // Build x402 payload for a USDC payment
  const signX402Payment = useCallback(async (amountUsdc: number): Promise<any | null> => {
    if (!state.address) return null;

    const USDC_ADDR = '0x74b7f16337b8972027f6196a17a631ac6de26d22';
    const ARENA_RECV = process.env.NEXT_PUBLIC_ARENA_WALLET ?? '0x991442af55370b91930c5617b472b0e468e97bb2';
    const amountMicro = Math.round(amountUsdc * 1_000_000);
    const nonce = `0x${crypto.randomUUID().replace(/-/g, '')}`;
    const validBefore = Math.floor(Date.now() / 1000) + 300;

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
        verifyingContract: USDC_ADDR,
      },
      message: {
        from: state.address,
        to: ARENA_RECV,
        value: String(amountMicro),
        validAfter: '0',
        validBefore: String(validBefore),
        nonce,
      },
    };

    const signature = await signEip712(typedData);
    if (!signature) return null;

    return {
      signature,
      from: state.address,
      to: ARENA_RECV,
      value: String(amountMicro),
      validAfter: '0',
      validBefore: String(validBefore),
      nonce,
    };
  }, [state.address, signEip712]);

  return {
    ...state,
    signEip712,
    signX402Payment,
  };
}
