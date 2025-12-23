import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'CryptoVeil Grid',
  projectId: 'eaa0f7d1d8d348788e8a13b5b9f2c84a',
  chains: [sepolia],
  ssr: false,
});
