'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Standard EIP-1193 Wallet Hook — replaces Privy entirely
// Supports: OKX Wallet, MetaMask, Coinbase, any injected wallet
// Falls back to server-side OKX Agentic Wallet (onchainos CLI)
// ═══════════════════════════════════════════════════════════════════════════════

export type WalletSource = 'okx-extension' | 'metamask' | 'injected' | 'okx-agentic' | null;

interface WalletState {
  /** Whether the wallet state has been initialized */
  ready: boolean;
  /** Whether a wallet is connected */
  connected: boolean;
  /** The connected wallet address (checksummed) */
  address: string | null;
  /** Which wallet is connected */
  source: WalletSource;
  /** Chain ID (196 = X Layer) */
  chainId: number | null;
  /** Loading state */
  loading: boolean;
}

interface WalletContextValue extends WalletState {
  /** Connect wallet — opens browser extension or agentic fallback */
  connect: () => Promise<string | null>;
  /** Disconnect wallet */
  disconnect: () => void;
  /** Sign EIP-712 typed data */
  signTypedData: (typedData: object) => Promise<string | null>;
  /** Sign x402 USDC payment */
  signX402Payment: (amountUsdc: number) => Promise<any | null>;
  /** Get the raw EIP-1193 provider */
  getProvider: () => any;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/** Get the best available EIP-1193 provider */
function getInjectedProvider(): { provider: any; source: WalletSource } | null {
  if (typeof window === 'undefined') return null;

  // Prefer OKX Wallet
  const okx = (window as any).okxwallet;
  if (okx) return { provider: okx, source: 'okx-extension' };

  // Then MetaMask
  const mm = (window as any).ethereum;
  if (mm?.isMetaMask) return { provider: mm, source: 'metamask' };

  // Any other injected provider
  if (mm) return { provider: mm, source: 'injected' };

  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    ready: false,
    connected: false,
    address: null,
    source: null,
    chainId: null,
    loading: true,
  });

  // Check for existing connection on mount
  useEffect(() => {
    const init = async () => {
      const injected = getInjectedProvider();
      if (injected) {
        try {
          // Check if already connected (don't prompt)
          const accounts: string[] = await injected.provider.request({ method: 'eth_accounts' });
          if (accounts?.[0]) {
            const chainHex = await injected.provider.request({ method: 'eth_chainId' });
            setState({
              ready: true,
              connected: true,
              address: accounts[0],
              source: injected.source,
              chainId: parseInt(chainHex, 16),
              loading: false,
            });
            return;
          }
        } catch {}
      }

      // Try server-side agentic wallet
      try {
        const res = await fetch('/api/okx-wallet');
        const data = await res.json();
        if (data.loggedIn && data.address) {
          setState({
            ready: true,
            connected: true,
            address: data.address,
            source: 'okx-agentic',
            chainId: 196,
            loading: false,
          });
          return;
        }
      } catch {}

      setState({ ready: true, connected: false, address: null, source: null, chainId: null, loading: false });
    };

    init();
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    const injected = getInjectedProvider();
    if (!injected) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState(s => ({ ...s, connected: false, address: null, source: null }));
      } else {
        setState(s => ({ ...s, connected: true, address: accounts[0], source: injected.source }));
      }
    };

    const handleChainChanged = (chainHex: string) => {
      setState(s => ({ ...s, chainId: parseInt(chainHex, 16) }));
    };

    injected.provider.on?.('accountsChanged', handleAccountsChanged);
    injected.provider.on?.('chainChanged', handleChainChanged);

    return () => {
      injected.provider.removeListener?.('accountsChanged', handleAccountsChanged);
      injected.provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    const injected = getInjectedProvider();
    if (!injected) {
      // No wallet extension — open OKX Wallet install page
      window.open('https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge', '_blank');
      return null;
    }

    try {
      const accounts: string[] = await injected.provider.request({ method: 'eth_requestAccounts' });
      if (accounts?.[0]) {
        const chainHex = await injected.provider.request({ method: 'eth_chainId' });
        setState({
          ready: true,
          connected: true,
          address: accounts[0],
          source: injected.source,
          chainId: parseInt(chainHex, 16),
          loading: false,
        });
        return accounts[0];
      }
    } catch {}
    return null;
  }, []);

  const disconnect = useCallback(() => {
    setState({ ready: true, connected: false, address: null, source: null, chainId: null, loading: false });
  }, []);

  const getProvider = useCallback(() => {
    return getInjectedProvider()?.provider ?? null;
  }, []);

  const signTypedData = useCallback(async (typedData: object): Promise<string | null> => {
    if (!state.address) return null;

    // Extension path
    if (state.source !== 'okx-agentic') {
      const injected = getInjectedProvider();
      if (injected) {
        try {
          return await injected.provider.request({
            method: 'eth_signTypedData_v4',
            params: [state.address, JSON.stringify(typedData)],
          });
        } catch { return null; }
      }
    }

    // Server-side agentic wallet fallback
    try {
      const res = await fetch('/api/okx-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign-eip712', message: typedData, from: state.address }),
      });
      const data = await res.json();
      return data.ok ? data.signature : null;
    } catch { return null; }
  }, [state.address, state.source]);

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
          { name: 'name', type: 'string' }, { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' }, { name: 'verifyingContract', type: 'address' },
        ],
        TransferWithAuthorization: [
          { name: 'from', type: 'address' }, { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' }, { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' },
        ],
      },
      primaryType: 'TransferWithAuthorization',
      domain: { name: 'USD Coin', version: '2', chainId: 196, verifyingContract: USDC_ADDR },
      message: {
        from: state.address, to: ARENA_RECV, value: String(amountMicro),
        validAfter: '0', validBefore: String(validBefore), nonce,
      },
    };

    const signature = await signTypedData(typedData);
    if (!signature) return null;

    return {
      signature, from: state.address, to: ARENA_RECV,
      value: String(amountMicro), validAfter: '0', validBefore: String(validBefore), nonce,
    };
  }, [state.address, signTypedData]);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, signTypedData, signX402Payment, getProvider }}>
      {children}
    </WalletContext.Provider>
  );
}

/** Use the wallet context — must be inside <WalletProvider> */
export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within <WalletProvider>');
  return ctx;
}
