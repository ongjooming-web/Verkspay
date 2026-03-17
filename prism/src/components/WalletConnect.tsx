'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './Button'
import { Card, CardBody, CardHeader } from './Card'

interface WalletConnectProps {
  onWalletConnected?: (address: string, network: string) => void
  onWalletDisconnected?: () => void
  readOnly?: boolean
}

// Mobile detection utilities
const MOBILE_DETECTION = {
  isIOS: (): boolean => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  },
  isAndroid: (): boolean => {
    return /Android/.test(navigator.userAgent)
  },
  isMobile: (): boolean => {
    return /iPhone|iPad|iPod|Android/.test(navigator.userAgent)
  },
  isMetaMaskMobile: (): boolean => {
    if (!MOBILE_DETECTION.isMobile()) return false
    return !!(window as any).ethereum
  },
  isPhantomMobile: (): boolean => {
    if (!MOBILE_DETECTION.isMobile()) return false
    return !!(window as any).phantom?.solana
  }
}

// Address format validators
const ADDRESS_VALIDATORS = {
  solana: (address: string): boolean => {
    // Solana addresses are base58 encoded, 32 bytes = 44 characters in base58
    if (!/^[1-9A-HJ-NP-Z]{32,44}$/.test(address)) return false
    // Additional check: must be valid length
    return address.length >= 32 && address.length <= 44
  },
  evm: (address: string): boolean => {
    // EVM addresses are 42 character hex strings (0x + 40 hex chars)
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
}

// Wallet provider detection & connection
const WALLET_PROVIDERS = {
  solana: {
    getProvider: (): any => {
      if (typeof window === 'undefined') return null
      return (window as any).phantom?.solana
    },
    isConnected: (provider: any): boolean => provider?.isConnected || false,
    requestConnection: async (): Promise<string | null> => {
      const provider = WALLET_PROVIDERS.solana.getProvider()
      if (!provider) throw new Error('Phantom wallet not installed')
      
      try {
        const response = await provider.connect()
        return response.publicKey.toString()
      } catch (err: any) {
        if (err.code === 4001) throw new Error('User rejected connection request')
        throw err
      }
    },
    disconnect: async (): Promise<void> => {
      const provider = WALLET_PROVIDERS.solana.getProvider()
      if (provider?.disconnect) {
        await provider.disconnect()
      }
    }
  },
  evm: {
    getProvider: (): any => {
      if (typeof window === 'undefined') return null
      return (window as any).ethereum
    },
    isConnected: (provider: any): boolean => {
      return !!provider && typeof provider.request === 'function'
    },
    requestConnection: async (): Promise<string | null> => {
      const provider = WALLET_PROVIDERS.evm.getProvider()
      if (!provider) throw new Error('No EVM wallet detected. Please install MetaMask or use WalletConnect')
      
      try {
        const accounts: string[] = await provider.request({
          method: 'eth_requestAccounts'
        })
        return accounts[0] || null
      } catch (err: any) {
        if (err.code === 4001) throw new Error('User rejected connection request')
        throw err
      }
    },
    disconnect: async (): Promise<void> => {
      // EVM wallets don't have a standard disconnect method
      // but we clear from our storage
    }
  }
}

export function WalletConnectComponent({
  onWalletConnected,
  onWalletDisconnected,
  readOnly = false
}: WalletConnectProps) {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<'base' | 'ethereum' | 'solana'>('base')
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [networkMismatch, setNetworkMismatch] = useState(false)

  // Network chain IDs and metadata
  const NETWORK_CONFIGS = {
    base: { chainId: 8453, name: 'Base', rpc: 'https://mainnet.base.org', type: 'evm' as const },
    ethereum: { chainId: 1, name: 'Ethereum Mainnet', rpc: 'https://eth.drpc.org', type: 'evm' as const },
    solana: { chainId: 0, name: 'Solana Mainnet', rpc: 'https://api.mainnet-beta.solana.com', type: 'solana' as const }
  } as const

  useEffect(() => {
    loadWalletData()
    checkMobileWalletReturn()
  }, [user?.id])

  // Load stored wallet data from Supabase
  const loadWalletData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData?.user)
      console.log('[WalletConnect] Current user:', userData?.user?.id)

      if (!userData?.user?.id) {
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_address, usdc_network')
        .eq('id', userData.user.id)
        .single()

      if (profileError) {
        console.error('[WalletConnect] Profile load error:', profileError)
      }

      if (profile?.wallet_address) {
        const loadedAddress = profile.wallet_address
        const loadedNetwork = (profile.usdc_network || 'base') as 'base' | 'ethereum' | 'solana'
        
        console.log('[WalletConnect] Loaded wallet:', { address: loadedAddress.slice(0, 6) + '...', network: loadedNetwork })
        
        // Validate address format matches network
        if (!validateAddressForNetwork(loadedAddress, loadedNetwork)) {
          console.error('[WalletConnect] Address format validation failed:', { address: loadedAddress, network: loadedNetwork })
          setError(`Invalid ${loadedNetwork} address format stored. Please reconnect.`)
          setNetworkMismatch(true)
          return
        }

        setConnectedAddress(loadedAddress)
        setSelectedNetwork(loadedNetwork)
      } else {
        console.log('[WalletConnect] No wallet connected')
      }
    } catch (err: any) {
      console.error('[WalletConnect] Error loading wallet data:', err)
      setError('Failed to load wallet data')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Validate address format matches the selected network
   */
  const validateAddressForNetwork = (address: string, network: 'base' | 'ethereum' | 'solana'): boolean => {
    const networkType = NETWORK_CONFIGS[network].type
    
    if (networkType === 'solana') {
      return ADDRESS_VALIDATORS.solana(address)
    } else {
      return ADDRESS_VALIDATORS.evm(address)
    }
  }

  const truncateAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  /**
   * Get appropriate wallet provider based on network selection
   */
  const getWalletProvider = (network: 'base' | 'ethereum' | 'solana') => {
    const networkType = NETWORK_CONFIGS[network].type
    return networkType === 'solana' ? WALLET_PROVIDERS.solana : WALLET_PROVIDERS.evm
  }

  /**
   * Handle mobile wallet deep linking (MetaMask/Phantom on iOS/Android)
   */
  const handleMobileWalletConnection = async () => {
    try {
      console.log('[WalletConnect] Mobile wallet connection requested', { network: selectedNetwork, isMobile: MOBILE_DETECTION.isMobile() })

      if (!user?.id) {
        throw new Error('User not authenticated. Please sign in first.')
      }

      if (selectedNetwork === 'solana') {
        // Phantom mobile deep link
        if (!MOBILE_DETECTION.isPhantomMobile()) {
          throw new Error('Phantom wallet not found on this device. Please install Phantom to connect to Solana.')
        }

        console.log('[WalletConnect] Using Phantom mobile deep link for Solana')
        
        // Store intended action in sessionStorage so we can complete it on return
        const returnUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
        sessionStorage.setItem('phantom_return_url', returnUrl)
        sessionStorage.setItem('phantom_network', 'solana')
        sessionStorage.setItem('phantom_user_id', user.id)

        // Redirect to Phantom with deeplink
        const phantomDeepLink = `https://phantom.app/ul/browse/${encodeURIComponent(returnUrl)}?ref=prism`
        window.location.href = phantomDeepLink

        // Give it a moment to redirect
        await new Promise(resolve => setTimeout(resolve, 1000))
      } else {
        // MetaMask mobile deep link (Base or Ethereum)
        if (!MOBILE_DETECTION.isMetaMaskMobile()) {
          throw new Error('MetaMask wallet not found on this device. Please install MetaMask.')
        }

        console.log('[WalletConnect] Using MetaMask mobile deep link for', selectedNetwork)

        // Store intended action in sessionStorage
        const returnUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
        sessionStorage.setItem('metamask_return_url', returnUrl)
        sessionStorage.setItem('metamask_network', selectedNetwork)
        sessionStorage.setItem('metamask_user_id', user.id)

        // For MetaMask mobile, we trigger the connection and it handles the deeplink
        const provider = WALLET_PROVIDERS.evm.getProvider()
        if (provider && provider.request) {
          try {
            const accounts = await provider.request({
              method: 'eth_requestAccounts'
            })
            
            if (accounts && accounts.length > 0) {
              const address = accounts[0]
              console.log('[WalletConnect] Got MetaMask address on mobile:', address.slice(0, 6) + '...')
              
              // Validate and save immediately on mobile
              if (validateAddressForNetwork(address, selectedNetwork)) {
                await saveMobileWalletAddress(address)
              } else {
                throw new Error('Invalid address format for ' + selectedNetwork)
              }
            }
          } catch (err: any) {
            console.error('[WalletConnect] MetaMask mobile connection error:', err)
            throw err
          }
        }
      }
    } catch (err: any) {
      console.error('[WalletConnect] Mobile wallet error:', err)
      setError(err.message || 'Failed to connect mobile wallet')
    }
  }

  /**
   * Save wallet address returned from mobile app
   */
  const saveMobileWalletAddress = async (address: string) => {
    try {
      setSaving(true)
      console.log('[WalletConnect] Saving mobile wallet address:', address.slice(0, 6) + '...')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_address: address,
          usdc_network: selectedNetwork,
          payment_method: 'usdc',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Verify save
      const { data: verifyProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('wallet_address, usdc_network')
        .eq('id', user.id)
        .single()

      if (verifyError || verifyProfile?.wallet_address !== address) {
        throw new Error('Failed to verify wallet save')
      }

      console.log('[WalletConnect] Mobile wallet saved and verified')
      setConnectedAddress(address)
      setSuccess(true)

      if (onWalletConnected) {
        onWalletConnected(address, selectedNetwork)
      }

      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('[WalletConnect] Error saving mobile wallet:', err)
      setError(err.message || 'Failed to save wallet')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle checking for mobile wallet connection on page load
   */
  const checkMobileWalletReturn = async () => {
    try {
      // Check if we're returning from MetaMask
      const metamaskUserId = sessionStorage.getItem('metamask_user_id')
      const metamaskNetwork = sessionStorage.getItem('metamask_network')
      
      if (metamaskUserId === user?.id && metamaskNetwork) {
        console.log('[WalletConnect] Detected MetaMask return from mobile app')
        
        const provider = WALLET_PROVIDERS.evm.getProvider()
        if (provider && provider.request) {
          try {
            const accounts = await provider.request({
              method: 'eth_accounts'
            })
            
            if (accounts && accounts.length > 0) {
              const address = accounts[0]
              console.log('[WalletConnect] Got MetaMask address on return:', address.slice(0, 6) + '...')
              await saveMobileWalletAddress(address)
              
              // Clean up session
              sessionStorage.removeItem('metamask_user_id')
              sessionStorage.removeItem('metamask_network')
              sessionStorage.removeItem('metamask_return_url')
            }
          } catch (err: any) {
            console.error('[WalletConnect] Error checking MetaMask on return:', err)
          }
        }
      }

      // Check if we're returning from Phantom
      const phantomUserId = sessionStorage.getItem('phantom_user_id')
      const phantomNetwork = sessionStorage.getItem('phantom_network')
      
      if (phantomUserId === user?.id && phantomNetwork) {
        console.log('[WalletConnect] Detected Phantom return from mobile app')
        
        const provider = WALLET_PROVIDERS.solana.getProvider()
        if (provider) {
          try {
            // Check if already connected
            if (provider.isConnected) {
              const response = await provider.connect()
              const address = response.publicKey.toString()
              console.log('[WalletConnect] Got Phantom address on return:', address.slice(0, 6) + '...')
              await saveMobileWalletAddress(address)
              
              // Clean up session
              sessionStorage.removeItem('phantom_user_id')
              sessionStorage.removeItem('phantom_network')
              sessionStorage.removeItem('phantom_return_url')
            }
          } catch (err: any) {
            console.error('[WalletConnect] Error checking Phantom on return:', err)
          }
        }
      }
    } catch (err: any) {
      console.error('[WalletConnect] Error in mobile return check:', err)
    }
  }

  /**
   * Connect wallet with network-aware provider selection
   */
  const handleConnectWallet = async () => {
    setConnecting(true)
    setError(null)
    setSuccess(false)
    setSaving(false)
    setNetworkMismatch(false)

    try {
      if (typeof window === 'undefined') {
        throw new Error('Wallet connection requires browser environment')
      }

      if (!user?.id) {
        throw new Error('User not authenticated. Please sign in first.')
      }

      // On mobile, use deep linking approach
      if (MOBILE_DETECTION.isMobile()) {
        console.log('[WalletConnect] Mobile detected, using deep linking')
        setConnecting(false)
        await handleMobileWalletConnection()
        return
      }

      console.log('[WalletConnect] Starting connection for network:', selectedNetwork)

      // Get provider for selected network
      const provider = getWalletProvider(selectedNetwork)
      const providerInstance = provider.getProvider()

      // Network-specific checks
      if (selectedNetwork === 'solana') {
        if (!providerInstance) {
          throw new Error('Phantom wallet not installed. Please install Phantom to connect to Solana.')
        }
      } else {
        // EVM networks (Base, Ethereum)
        if (!providerInstance) {
          throw new Error('No EVM wallet detected. Please install MetaMask or another EVM wallet.')
        }

        // For EVM networks, attempt to switch to the correct chain
        try {
          const chainIdHex = `0x${NETWORK_CONFIGS[selectedNetwork].chainId.toString(16)}`
          await providerInstance.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }]
          })
        } catch (switchErr: any) {
          // Chain not added, user may need to add it manually
          if (switchErr.code !== 4902) {
            console.warn('[WalletConnect] Could not switch chain:', switchErr)
          }
        }
      }

      // Request wallet connection
      console.log('[WalletConnect] Requesting connection from wallet...')
      const connectedAddr = await provider.requestConnection()

      if (!connectedAddr) {
        throw new Error('Failed to get wallet address')
      }

      console.log('[WalletConnect] Got address:', connectedAddr.slice(0, 6) + '...')

      // Validate address format
      if (!validateAddressForNetwork(connectedAddr, selectedNetwork)) {
        console.error('[WalletConnect] Address validation failed:', { 
          address: connectedAddr, 
          network: selectedNetwork,
          expectedType: NETWORK_CONFIGS[selectedNetwork].type 
        })
        setNetworkMismatch(true)
        throw new Error(
          `Address format mismatch! Got ${selectedNetwork === 'solana' ? 'EVM' : 'Solana'} address for ${selectedNetwork} network.`
        )
      }

      // Now save to Supabase
      setSaving(true)
      console.log('[WalletConnect] Saving to profiles table...')

      const { error: updateError, data: updateData } = await supabase
        .from('profiles')
        .update({
          wallet_address: connectedAddr,
          usdc_network: selectedNetwork,
          payment_method: 'usdc',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()

      if (updateError) {
        console.error('[WalletConnect] Update error:', updateError)
        throw updateError
      }

      console.log('[WalletConnect] Saved to database, verifying...')
      setSaving(false)

      // Verify that the wallet was actually saved
      const { data: verifyProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('wallet_address, usdc_network')
        .eq('id', user.id)
        .single()

      if (verifyError) {
        console.error('[WalletConnect] Verification query failed:', verifyError)
        throw new Error('Could not verify wallet save')
      }

      if (verifyProfile?.wallet_address !== connectedAddr) {
        console.error('[WalletConnect] Wallet address not persisted!', {
          expected: connectedAddr,
          got: verifyProfile?.wallet_address
        })
        throw new Error('Wallet address failed to persist. Please try again.')
      }

      console.log('[WalletConnect] Wallet successfully saved and verified:', verifyProfile)

      setConnectedAddress(connectedAddr)
      setSuccess(true)

      if (onWalletConnected) {
        onWalletConnected(connectedAddr, selectedNetwork)
      }

      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('[WalletConnect] Wallet connection error:', err)
      const errorMessage = err.message || 'Failed to connect wallet'
      setError(errorMessage)
    } finally {
      setConnecting(false)
      setSaving(false)
    }
  }

  /**
   * Disconnect wallet from app (not from wallet provider)
   */
  const handleDisconnectWallet = async () => {
    if (!window.confirm('Are you sure you want to disconnect this wallet?')) {
      return
    }

    setConnecting(true)
    setError(null)

    try {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Optionally disconnect from Solana provider
      if (selectedNetwork === 'solana') {
        await WALLET_PROVIDERS.solana.disconnect()
      }

      // Remove from Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_address: null,
          payment_method: 'bank',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setConnectedAddress(null)
      setNetworkMismatch(false)

      if (onWalletDisconnected) {
        onWalletDisconnected()
      }
    } catch (err: any) {
      console.error('Disconnect error:', err)
      setError(err.message || 'Failed to disconnect wallet')
    } finally {
      setConnecting(false)
    }
  }

  /**
   * Switch to a different network - resets wallet connection
   */
  const handleNetworkChange = (newNetwork: 'base' | 'ethereum' | 'solana') => {
    if (connectedAddress) {
      setError(null)
      setNetworkMismatch(false)
      
      // If switching networks, user needs to reconnect
      if (newNetwork !== selectedNetwork) {
        const oldNetwork = NETWORK_CONFIGS[selectedNetwork].name
        const newNetworkName = NETWORK_CONFIGS[newNetwork].name
        setError(`Switching from ${oldNetwork} to ${newNetworkName}. Please reconnect your wallet.`)
        setConnectedAddress(null)
      }
    }
    setSelectedNetwork(newNetwork)
  }

  if (readOnly && !connectedAddress) {
    return null
  }

  const networkType = NETWORK_CONFIGS[selectedNetwork].type
  const isConnecting = connecting || loading || saving
  const isMobile = MOBILE_DETECTION.isMobile()

  return (
    <>
      {error && (
        <div className={`mb-4 glass px-4 py-3 rounded-lg border-red-500/50 ${networkMismatch ? 'bg-red-500/20' : 'bg-red-500/10'} text-red-300`}>
          ✗ {error}
        </div>
      )}

      {saving && (
        <div className="mb-4 glass px-4 py-3 rounded-lg border-blue-500/50 bg-blue-500/10 text-blue-300 flex items-center gap-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          ⏳ Saving wallet address to database...
        </div>
      )}

      {success && (
        <div className="mb-4 glass px-4 py-3 rounded-lg border-green-500/50 bg-green-500/10 text-green-300">
          ✓ Wallet connected and saved successfully!
        </div>
      )}

      {isMobile && (
        <div className="mb-4 glass px-4 py-3 rounded-lg border-blue-400/30 bg-blue-500/10 text-blue-300">
          <p className="text-sm">
            📱 <strong>Mobile Mode:</strong> You'll be directed to your wallet app to authorize connection.
          </p>
        </div>
      )}

      {!connectedAddress ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Network
            </label>
            <select
              value={selectedNetwork}
              onChange={(e) => handleNetworkChange(e.target.value as any)}
              disabled={readOnly || isConnecting}
              className="glass px-4 py-3 rounded-lg text-white w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 appearance-none disabled:opacity-50"
            >
              <option value="base" className="bg-slate-900">
                ⚡ Base (Recommended - Fast & Cheap)
              </option>
              <option value="ethereum" className="bg-slate-900">
                Ξ Ethereum Mainnet
              </option>
              <option value="solana" className="bg-slate-900">
                ◎ Solana
              </option>
            </select>
            
            <p className="text-gray-400 text-xs mt-2">
              {selectedNetwork === 'base' && (
                <>
                  Requires: MetaMask or any EVM wallet<br />
                  Base offers the fastest and cheapest USDC transactions
                </>
              )}
              {selectedNetwork === 'ethereum' && (
                <>
                  Requires: MetaMask or any EVM wallet<br />
                  Ethereum mainnet is fully decentralized
                </>
              )}
              {selectedNetwork === 'solana' && (
                <>
                  Requires: Phantom wallet<br />
                  Solana offers high throughput and low fees
                </>
              )}
            </p>
          </div>

          <div className="glass rounded-lg p-4 border-blue-400/30 bg-blue-500/10">
            <p className="text-blue-300 text-sm">
              <strong>ℹ️ Connecting to:</strong> {NETWORK_CONFIGS[selectedNetwork].name}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {networkType === 'solana' 
                ? 'Address format: Base58 encoded (44 chars)' 
                : 'Address format: 0x + 40 hex characters'}
            </p>
          </div>

          <Button
            onClick={handleConnectWallet}
            disabled={isConnecting || readOnly}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/50"
          >
            {connecting ? '⏳ Connecting...' : saving ? '💾 Saving to Database...' : isMobile ? (
              networkType === 'solana' ? '🔗 Open Phantom' : '🔗 Open MetaMask'
            ) : (
              `🔗 Connect ${networkType === 'solana' ? 'Phantom' : 'Wallet'}`
            )}
          </Button>

          {isMobile ? (
            <p className="text-gray-400 text-sm text-center text-xs">
              {networkType === 'solana' 
                ? 'Opens Phantom wallet app. Install if needed at phantom.app'
                : 'Opens MetaMask wallet app. Install if needed at metamask.io'}
            </p>
          ) : (
            <p className="text-gray-400 text-sm text-center text-xs">
              {networkType === 'solana' 
                ? 'Requires Phantom wallet. Download from phantom.app'
                : 'Supports MetaMask and other EVM wallets'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connected wallet display */}
          <div className="glass rounded-lg p-4 border-green-400/30 bg-green-500/10">
            <p className="text-gray-400 text-sm mb-2">Connected Wallet</p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-mono text-sm">{truncateAddress(connectedAddress)}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Network: <span className="text-blue-300 font-semibold">{NETWORK_CONFIGS[selectedNetwork].name}</span>
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Format: <span className="text-green-300 text-xs">
                    {networkType === 'solana' ? 'Solana (Base58)' : 'EVM (0x...)'}
                  </span>
                </p>
              </div>
              <span className="text-2xl">✓</span>
            </div>
          </div>

          {/* Network switcher */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Switch Network</label>
            <select
              value={selectedNetwork}
              onChange={(e) => handleNetworkChange(e.target.value as any)}
              disabled={readOnly}
              className="glass px-4 py-3 rounded-lg text-white w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 appearance-none disabled:opacity-50"
            >
              <option value="base" className="bg-slate-900">⚡ Base</option>
              <option value="ethereum" className="bg-slate-900">Ξ Ethereum</option>
              <option value="solana" className="bg-slate-900">◎ Solana</option>
            </select>
            <p className="text-amber-300 text-xs mt-2">
              ⚠️ Changing networks requires reconnecting your wallet
            </p>
          </div>

          {/* Info tip */}
          <div className="glass rounded-lg p-4 border-amber-400/30 bg-amber-500/10">
            <p className="text-amber-300 text-sm">
              💡 <strong>Tip:</strong> Your {NETWORK_CONFIGS[selectedNetwork].name} wallet address is visible to invoice senders. Use a dedicated wallet for invoicing.
            </p>
          </div>

          {/* Disconnect button */}
          {!readOnly && (
            <Button
              onClick={handleDisconnectWallet}
              disabled={isConnecting}
              variant="outline"
              className="w-full border-red-500/50 text-red-400 hover:border-red-400/80 hover:text-red-300 hover:bg-red-500/10"
            >
              {isConnecting ? '⏳ Disconnecting...' : '🔓 Disconnect Wallet'}
            </Button>
          )}
        </div>
      )}
    </>
  )
}
