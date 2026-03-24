import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { xLayer } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Agent Arena',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '0ca407866485bb159d3a29329ac34ff0',
  chains: [xLayer],
  ssr: true, 
});
