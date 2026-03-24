'use client';

import dynamic from 'next/dynamic';

const X402Button = dynamic(
  () => import('./x402-btn').then(m => ({ default: m.X402Button })),
  { ssr: false, loading: () => <div className="h-10 w-44 rounded-full bg-white/10 animate-pulse" /> }
);

export function X402ButtonClient(props: {
  label:         string;
  amount?:       number;
  resourceType?: string;
  resourceId?:   string;
  onUnlock?:     () => void;
  redirectHref?: string;
}) {
  return <X402Button {...props} />;
}
