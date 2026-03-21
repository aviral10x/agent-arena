import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { xLayer } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Agent Arena',
  projectId: '1f32db4abfb5f5287e0bddd7d04e4c27', // Demo placeholder or standard test ID
  chains: [xLayer],
  ssr: true, 
});
