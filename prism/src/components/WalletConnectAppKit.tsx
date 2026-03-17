'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardBody, CardHeader } from './Card'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'appkit-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { size?: string },
        HTMLElement
      >
    }
  }
}

export function WalletConnectAppKit() {
  const [initialized, setInitialized] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Dynamically load AppKit to avoid SSR issues
    const loadAppKit = async () => {
      try {
        // Import AppKit
        const { createAppKit } = await import('@reown/appkit')

        const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
        if (!projectId) {
          setError('WalletConnect Project ID not configured')
          setLoading(false)
          return
        }

        // Create AppKit instance (handles mobile deep linking automatically)
        const appKit = createAppKit({
          projectId,
          metadata: {
            name: 'Prism',
            description: 'Invoicing & Payment Platform',
            url: typeof window !== 'undefined' ? window.location.origin : 'https://app.prismops.xyz',
            icons: ['https://app.prismops.xyz/logo.png']
          },
          networks: [
            {
              id: 8453,
              name: 'Base',
              currency: 'ETH',
              explorerUrl: 'https://basescan.org',
              rpcUrl: 'https://mainnet.base.org'
            },
            {
              id: 1,
              name: 'Ethereum',
              currency: 'ETH',
              explorerUrl: 'https://etherscan.io',
              rpcUrl: 'https://eth.llamarpc.com'
            }
          ],
          defaultNetwork: {
            id: 8453,
            name: 'Base',
            currency: 'ETH',
            explorerUrl: 'https://basescan.org',
            rpcUrl: 'https://mainnet.base.org'
          }
        })

        // Listen for connection state changes
        appKit?.subscribeAccount((account) => {
          if (account?.address) {
            handleWalletConnected(account.address)
          }
        })

        setInitialized(true)
        setLoading(false)

        // Load saved address from DB
        loadSavedAddress()
      } catch (err: any) {
        console.error('[AppKit] Init error:', err)
        setError(err.message || 'Failed to initialize AppKit')
        setLoading(false)
      }
    }

    loadAppKit()
  }, [])

  const loadSavedAddress = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', userData.user.id)
        .single()

      if (profile?.wallet_address) {
        setAddress(profile.wallet_address)
      }
    } catch (err) {
      console.error('[AppKit] Load address error:', err)
    }
  }

  const handleWalletConnected = async (walletAddress: string) => {
    try {
      console.log('[AppKit] Wallet connected:', walletAddress)

      // Get user
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) {
        setError('User not authenticated')
        return
      }

      // Prepare sign message
      const message = `Sign in to Prism\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`

      // Sign message (AppKit handles this via connected provider)
      // For now, just save address and mark as connected
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_address: walletAddress,
          updated_at: new Date().toISOString()
        })
        .eq('id', userData.user.id)

      if (updateError) {
        console.error('[AppKit] Save error:', updateError)
        setError('Failed to save wallet')
        return
      }

      setAddress(walletAddress)
      setError(null)
      console.log('[AppKit] Address saved successfully')
    } catch (err: any) {
      console.error('[AppKit] Connection error:', err)
      setError(err.message || 'Failed to connect wallet')
    }
  }

  const handleDisconnect = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.id) {
        await supabase
          .from('profiles')
          .update({ wallet_address: null })
          .eq('id', userData.user.id)
      }
      setAddress(null)
    } catch (err) {
      console.error('[AppKit] Disconnect error:', err)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardBody>
          <div className="animate-pulse">Loading wallet...</div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
      <CardHeader>
        <h3 className="text-lg font-semibold text-white">🔐 Connect Wallet (WalletConnect)</h3>
      </CardHeader>
      <CardBody className="space-y-4">
        {address ? (
          <>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/50 rounded-lg w-fit">
              <span className="text-green-400 text-lg">✓</span>
              <span className="text-green-300 font-semibold text-sm">Connected</span>
            </div>

            <div className="glass rounded-lg p-4 border-blue-400/30">
              <p className="text-gray-400 text-sm mb-2">Wallet Address</p>
              <p className="text-white font-mono text-sm break-all">{address}</p>
              <p className="text-gray-500 text-xs mt-2">
                Clients will send USDC to this address
              </p>
            </div>

            <button
              onClick={handleDisconnect}
              className="w-full px-4 py-2 bg-red-600/50 hover:bg-red-700/50 text-white rounded-lg transition"
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            {error && (
              <div className="glass rounded-lg p-4 border-red-500/30 bg-red-500/10">
                <p className="text-red-300 text-sm">❌ Error: {error}</p>
              </div>
            )}

            <div className="glass rounded-lg p-4 border-blue-400/30">
              <p className="text-gray-300 text-sm mb-4">
                Click below to connect your wallet. WalletConnect supports 300+ wallets including MetaMask, Phantom, Trust Wallet, and more.
              </p>
              <p className="text-gray-400 text-xs">
                Mobile: Deep links directly to your wallet app  
                Desktop: Shows wallet selection modal
              </p>
            </div>

            {/* AppKit Button - renders WalletConnect modal */}
            {initialized && (
              <div className="flex gap-2">
                <appkit-button size="md" />
              </div>
            )}

            {!initialized && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-300 text-sm">Initializing WalletConnect...</p>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  )
}
