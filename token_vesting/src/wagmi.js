import { createConfig, http, injected } from 'wagmi'
import { sepolia } from 'wagmi/chains'

export const supportedChain = sepolia

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL || undefined),
  },
})
