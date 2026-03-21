"use client";

import { useState } from "react";
import { useSignTypedData, useAccount } from "wagmi";

export function useX402Payment() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [paymentState, setPaymentState] = useState<"idle" | "awaiting_wallet" | "signing" | "success" | "error">("idle");

  const pay = async (amountUsdc: number = 1, memo: string = "x402: access") => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first via the RainbowKit button.");
      return false;
    }

    setPaymentState("awaiting_wallet");
    
    try {
      // Simulate receiving an HTTP 402 with an accepts[] payload from our server.
      // Real x402 would extract this from response headers. We hardcode the OKX USDG test token 
      // or USDC for the sake of the EIP-3009 signature simulation on X Layer (Chain 196).
      const tokenAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; 
      const amountMinimal = (amountUsdc * 1_000_000).toString(); // 6 decimals
      const nonce = crypto.randomUUID().replace(/-/g, ''); 
      const validBefore = Math.floor(Date.now() / 1000) + 300; // 5 mins

      const domain = {
        name: "USD Coin",
        version: "2",
        chainId: 196,
        verifyingContract: tokenAddress as `0x${string}`,
      };

      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const message = {
        from: address,
        to: "0x000000000000000000000000000000000000x402" as `0x${string}`,
        value: BigInt(amountMinimal),
        validAfter: BigInt(0),
        validBefore: BigInt(validBefore),
        nonce: `0x${nonce}` as `0x${string}`,
      };

      setPaymentState("signing");

      // Request EIP-3009 Signature via their injected wallet (MetaMask, OKX, etc)
      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "TransferWithAuthorization",
        message,
      });

      console.log("[x402] EIP-3009 Signature Generated:", signature);
      
      // In a real flow, we assemble the PAYMENT-SIGNATURE header and replay the HTTP request:
      /*
      const paymentPayload = {
        x402Version: 2,
        payload: {
          signature,
          authorization: { ...message }
        }
      };
      const headerValue = btoa(JSON.stringify(paymentPayload));
      // fetch('/api/...', { headers: { 'PAYMENT-SIGNATURE': headerValue } })
      */
      
      setPaymentState("success");
      return true;
      
    } catch (err) {
      console.error("x402 signature rejected or failed:", err);
      setPaymentState("error");
      setTimeout(() => setPaymentState("idle"), 3000);
      return false;
    }
  };

  return {
    pay,
    state: paymentState,
    isPending: paymentState === "awaiting_wallet" || paymentState === "signing",
    isSuccess: paymentState === "success",
    reset: () => setPaymentState("idle"),
  };
}
