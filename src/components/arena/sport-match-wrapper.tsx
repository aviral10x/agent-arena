'use client';

import dynamic from 'next/dynamic';

// SportMatchClient uses CSS animations + key-based rerender tricks
// that cause hydration mismatches if SSR'd. Load client-only.
const SportMatchClientInner = dynamic(
  () => import('./sport-match-client').then(m => ({ default: m.SportMatchClient })),
  { ssr: false, loading: () => (
    <div className="mx-auto max-w-7xl px-4 py-12 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-white/30">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[var(--teal)] rounded-full animate-spin" />
        <span className="text-sm">Loading match...</span>
      </div>
    </div>
  )}
);

// Re-export with same interface so the server page can import this
export { SportMatchClientInner as SportMatchClient };
