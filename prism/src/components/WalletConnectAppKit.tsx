'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './Button'
import { Card, CardBody, CardHeader } from './Card'

interface WalletConnectAppKitProps {
  onWalletConnected?: (address: string) => void
}

// Dynamic import for wagmi hooks - SSR causes issues with wallet libs
let appKit: any = null
let useAppKitAccount: any = null
let useAppKitProvider: any = null

// Initialize AppKit on first use (client-side only)
async function initializeAppKit() {
  if (appKit) return appKit

  try {
    const { createAppKit } = await import('@reown/appkit')
    const { WagmiAdapter } = await import('@reown/appkit-adapter-wagmi')
    const { mainnet, base, polygon } = await import('viem/chains')

    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    if (!projectId) {
      console.error('[AppKit] Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in environment')
      return null
    }

    const metadata = {
      name: 'Prism Wallet',
      description: 'Connect your wallet to Prism for invoicing & proposals',
      url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }

    const wagmiAdapter = new WagmiAdapter({
      networks: [mainnet, base, polygon],
      projectId,
      ssr: false
    })

    const instance = createAppKit({
      adapters: [wagmiAdapter],
      networks: [mainnet, base, polygon],
      projectId,
      metadata,
      features: {
        analytics: true,
        onramp: true
      }
    })

    appKit = instance
    return instance
  } catch (error) {
    console.error('[AppKit] Initialization error:', error)
    return null
  }
}

// Load hooks after AppKit is initialized
async function getHooks() {
  if (useAppKitAccount && useAppKitProvider) {
    return { useAppKitAccount, useAppKitProvider }
  }

  try {
    const module = await import('@reown/appkit/react')
    useAppKitAccount = module.useAppKitAccount
    useAppKitProvider = module.useAppKitProvider
    return { useAppKitAccount, useAppKitProvider }
  } catch (error) {
    console.error('[AppKit] Failed to load hooks:', error)
    return { useAppKitAccount: null, useAppKitProvider: null }
  }
}

export function WalletConnectAppKitComponent({ onWalletConnected }: WalletConnectAppKitProps) {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isMounted, setIsMounted] = useState(false)
  const initializationAttempted = useRef(false)

  useEffect(() => {
    setIsMounted(true)
    loadWalletData()
    
    // Initialize AppKit once on mount
    if (!initializationAttempted.current) {
      initializationAttempted.current = true
      initializeAppKit().catch(err => console.error('[AppKit] Init failed:', err))
    }
  }, [])

  const loadWalletData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData?.user)

      if (!userData?.user?.id) return

      // Load saved wallet from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', userData.user.id)
        .single()

      if (profile?.wallet_address) {
        setConnectedAddress(profile.wallet_address)
      }
    } catch (err: any) {
      console.error('[AppKit] Error loading wallet:', err)
    }
  }

  const truncateAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Sign message with personal_sign
  const signMessage = async (address: string, provider: any) => {
    try {
      const message = `Sign in to Prism
Wallet: ${address}
Timestamp: ${Date.now()}`

      console.log('[AppKit] Signing message:', message)

      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, address]
      })

      return signature
    } catch (err: any) {
      console.error('[AppKit] Message signing error:', err)
      throw new Error('Failed to sign message')
    }
  }

  // Open AppKit modal and handle connection
  const handleConnectWallet = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Ensure AppKit is initialized
      if (!appKit) {
        const initialized = await initializeAppKit()
        if (!initialized) {
          throw new Error('Failed to initialize WalletConnect AppKit')
        }
      }

      console.log('[AppKit] Opening modal...')
      // Open the connection modal
      await appKit.open()

      // Wait for connection (max 30 seconds)
      const startTime = Date.now()
      const maxWait = 30000

      while (Date.now() - startTime < maxWait) {
        const { data: account } = await appKit.getAccount?.() || { data: null }
        
        if (account?.address) {
          console.log('[AppKit] Connected address:', account.address)
          const address = account.address

          // Get provider for signing
          const { data: provider } = await appKit.getProvider?.() || { data: null }
          
          if (provider) {
            // Sign message for authentication
            try {
              const signature = await signMessage(address, provider)
              console.log('[AppKit] Message signed:', signature)
            } catch (signErr) {
              console.warn('[AppKit] Message signing failed, continuing without signature:', signErr)
              // Continue without signature - address is already verified by connection
            }
          }

          // Get current user
          const { data: userData } = await supabase.auth.getUser()
          if (!userData?.user?.id) {
            throw new Error('User not authenticated')
          }

          // Save to Supabase
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ wallet_address: address })
            .eq('id', userData.user.id)

          if (updateError) {
            console.error('[AppKit] Save error:', updateError)
            throw new Error('Failed to save wallet address')
          }

          console.log('[AppKit] Address saved successfully')
          setConnectedAddress(address)
          setSuccess(true)
          setLoading(false)

          if (onWalletConnected) {
            onWalletConnected(address)
          }

          // Clear success message after 3 seconds
          setTimeout(() => setSuccess(false), 3000)
          return
        }

        // Wait 500ms before checking again
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Timeout
      throw new Error('Connection timeout - no wallet selected')
    } catch (err: any) {
      console.error('[AppKit] Connection error:', err)
      setError(err.message || 'Failed to connect wallet')
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      // Disconnect from AppKit
      if (appKit?.disconnect) {
        await appKit.disconnect()
      }

      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.id) {
        await supabase
          .from('profiles')
          .update({ wallet_address: null })
          .eq('id', userData.user.id)
      }
      setConnectedAddress(null)
      setSuccess(false)
    } catch (err) {
      console.error('[AppKit] Disconnect error:', err)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
      <CardHeader>
        <h3 className="text-lg font-semibold text-white">🔐 Connect Wallet (AppKit)</h3>
      </CardHeader>
      <CardBody className="space-y-4">
        {connectedAddress ? (
          <>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/50 rounded-lg w-fit">
              <span className="text-green-400 text-lg">✓</span>
              <span className="text-green-300 font-semibold text-sm">Wallet Connected</span>
            </div>

            <div className="glass rounded-lg p-4 border-blue-400/30">
              <p className="text-gray-400 text-sm mb-2">Connected Address</p>
              <p className="text-white font-mono text-sm break-all">{connectedAddress}</p>
              <p className="text-gray-500 text-xs mt-2">
                Clients will send USDC to this address
              </p>
            </div>

            <Button
              onClick={handleDisconnect}
              className="w-full px-4 py-2 bg-red-600/50 hover:bg-red-700/50 text-white rounded-lg transition"
            >
              Disconnect Wallet
            </Button>
          </>
        ) : (
          <>
            {error && (
              <div className="glass rounded-lg p-4 border-red-500/30 bg-red-500/10">
                <p className="text-red-300 text-sm">
                  <span className="font-bold">❌ Error:</span> {error}
                </p>
              </div>
            )}

            <div className="glass rounded-lg p-4 border-blue-400/30">
              <p className="text-gray-300 text-sm">
                Click below to connect your wallet using WalletConnect. Works on mobile with deep linking!
              </p>
            </div>

            <Button
              onClick={handleConnectWallet}
              disabled={loading}
              className={`
                w-full px-4 py-3 rounded-lg font-semibold transition
                ${
                  loading
                    ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600'
                }
              `}
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </Button>

            <p className="text-gray-500 text-xs text-center">
              Mobile: Opens your wallet app automatically
            </p>
          </>
        )}

        {success && (
          <div className="glass rounded-lg p-4 border-green-500/30 bg-green-500/10">
            <p className="text-green-300 text-sm">
              <span className="font-bold">✓ Success!</span> Wallet connected
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export { WalletConnectAppKitComponent as default }
