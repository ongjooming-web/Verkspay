interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void
  isMetaMask?: boolean
  isPhantom?: boolean
  selectedAddress?: string | null
  networkVersion?: string
  chainId?: string
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

export {}
