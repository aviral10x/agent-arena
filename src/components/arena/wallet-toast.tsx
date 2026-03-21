"use client";

import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from "react";

type Toast = {
  id: string;
  message: string;
  type: "info" | "success" | "warning";
};

type ToastContextValue = {
  show: (message: string, type?: Toast["type"]) => void;
};

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext value={{ show }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-[rise_0.35s_ease] rounded-2xl border px-5 py-3 text-sm shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            style={{
              borderColor:
                toast.type === "success"
                  ? "rgba(73,243,166,0.4)"
                  : toast.type === "warning"
                    ? "rgba(255,212,121,0.4)"
                    : "rgba(102,227,255,0.4)",
              backgroundColor:
                toast.type === "success"
                  ? "rgba(73,243,166,0.12)"
                  : toast.type === "warning"
                    ? "rgba(255,212,121,0.12)"
                    : "rgba(10,19,36,0.92)",
              color:
                toast.type === "success"
                  ? "var(--green)"
                  : toast.type === "warning"
                    ? "var(--gold)"
                    : "var(--text-primary)",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function WalletButton() {
  const { show } = useToast();
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const handleConnect = useCallback(() => {
    if (connected) {
      setConnected(false);
      setAddress(null);
      show("Wallet disconnected", "info");
      return;
    }

    // Simulate wallet connection for now
    // TODO: Replace with real wagmi/RainbowKit when wallet phase is implemented
    show("Connecting to X Layer…", "info");

    setTimeout(() => {
      const mockAddr = "0x" + Array.from({ length: 8 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("") + "…" + Array.from({ length: 4 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

      setConnected(true);
      setAddress(mockAddr);
      show("Connected to X Layer (demo mode)", "success");
    }, 1000);
  }, [connected, show]);

  return (
    <button
      type="button"
      onClick={handleConnect}
      className="inline-flex items-center justify-center rounded-full bg-[var(--cyan)] px-5 py-3 text-sm font-medium text-slate-950 shadow-[0_10px_30px_rgba(102,227,255,0.28)] transition hover:-translate-y-0.5"
    >
      {connected ? (
        <>
          <span className="mr-2 h-2 w-2 rounded-full bg-[var(--green)]" />
          {address}
        </>
      ) : (
        "Connect wallet"
      )}
    </button>
  );
}

export function ActionButton({
  label,
  toastMessage,
  toastType = "warning",
  href,
}: {
  label: string;
  toastMessage: string;
  toastType?: Toast["type"];
  href?: string;
}) {
  const { show } = useToast();

  return (
    <button
      type="button"
      onClick={() => {
        show(toastMessage, toastType);
        if (href) {
          setTimeout(() => {
            window.location.href = href;
          }, 600);
        }
      }}
      className="rounded-full bg-[var(--cyan)] px-4 py-2 text-sm font-medium text-slate-950 transition hover:-translate-y-0.5"
    >
      {label}
    </button>
  );
}
