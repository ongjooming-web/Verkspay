'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './Button'
import { Card, CardBody, CardHeader } from './Card'

interface WalletConnectProps {
  onWalletConnected?: (address: string) => void
  onWalletDisconnected?: () => void
  readOnly?: boolean
}

const WALLET_PROVIDERS = {
  // Phantom for Solana
  phantom: {
    getProvider: (): any => {
      if (typeof window === 'undefined') return null
      return (window as any).phantom?.solana
    },
    connect: async (): Promise<string> => {
      const provider = WALLET_PROVIDERS.phantom.getProvider()
      if (!provider) throw new Error('Phantom wallet not installed. Please install Phantom to connect.')
      try {
        const response = await provider.connect()
        return response.publicKey.toString()
      } catch (err: any) {
        if (err.code === 4001) throw new Error('Connection cancelled')
        throw err
      }
    },
    disconnect: async (): Promise<void> => {
      const provider = WALLET_PROVIDERS.phantom.getProvider()
      if (provider?.disconnect) {
        await provider.disconnect()
      }
    }
  },
  // MetaMask for EVM chains (Base, Ethereum)
  metamask: {
    getProvider: (): any => {
      if (typeof window === 'undefined') return null
      return (window as any).ethereum
    },
    connect: async (): Promise<string> => {
      const provider = WALLET_PROVIDERS.metamask.getProvider()
      if (!provider) throw new Error('MetaMask not installed. Please install MetaMask to connect.')
      try {
        const accounts: string[] = await provider.request({
          method: 'eth_requestAccounts'
        })
        return accounts[0] || ''
      } catch (err: any) {
        if (err.code === 4001) throw new Error('Connection cancelled')
        throw err
      }
    },
    disconnect: async (): Promise<void> => {
      // MetaMask doesn't have a standard disconnect
    }
  }
}

export function WalletConnectComponent({
  onWalletConnected,
  onWalletDisconnected,
  readOnly = false
}: WalletConnectProps) {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadWalletData()
  }, [])

  const loadWalletData = async () => {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData?.user)

      if (!userData?.user?.id) {
        setLoading(false)
        return
      }

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
      console.error('Error loading wallet:', err)
    } finally {
      setLoading(false)
    }
  }

  const truncateAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  /**
   * Simple: Connect wallet and save address
   */
  const handleConnectWallet = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!user?.id) {
        throw new Error('User not authenticated. Please sign in first.')
      }

      // Try MetaMask first (default for most users)
      let address: string | null = null
      let walletType = 'metamask'

      try {
        const metamaskProvider = WALLET_PROVIDERS.metamask.getProvider()
        if (metamaskProvider) {
          address = await WALLET_PROVIDERS.metamask.connect()
        }
      } catch (err: any) {
        console.log('MetaMask not available, trying Phantom...')
      }

      // If MetaMask failed, try Phantom
      if (!address) {
        try {
          const phantomProvider = WALLET_PROVIDERS.phantom.getProvider()
          if (phantomProvider) {
            address = await WALLET_PROVIDERS.phantom.connect()
            walletType = 'phantom'
          }
        } catch (err: any) {
          console.log('Phantom not available either')
        }
      }

      if (!address) {
        throw new Error(
          'No wallet detected. Please install MetaMask or Phantom.\n\n' +
          'MetaMask: https://metamask.io\n' +
          'Phantom: https://phantom.app'
        )
      }

      console.log('[WalletConnect] Got address from', walletType + ':', address.slice(0, 6) + '...')

      // Save to database
      setSaving(true)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_address: address,
          payment_method: 'usdc',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        throw new Error('Failed to save wallet address: ' + updateError.message)
      }

      // Verify save
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', user.id)
        .single()

      if (profile?.wallet_address !== address) {
        throw new Error('Wallet address failed to persist in database')
      }

      console.log('[WalletConnect] Wallet saved and verified')
      setConnectedAddress(address)
      setSuccess(true)

      if (onWalletConnected) {
        onWalletConnected(address)
      }

      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Connection error:', err)
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setLoading(false)
      setSaving(false)
    }
  }

  /**
   * Simple: Disconnect wallet
   */
  const handleDisconnectWallet = async () => {
    if (!window.confirm('Disconnect wallet?')) return

    setLoading(true)
    setError(null)

    try {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_address: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setConnectedAddress(null)

      if (onWalletDisconnected) {
        onWalletDisconnected()
      }
    } catch (err: any) {
      console.error('Disconnect error:', err)
      setError(err.message || 'Failed to disconnect wallet')
    } finally {
      setLoading(false)
    }
  }

  if (readOnly && !connectedAddress) {
    return null
  }

  return (
    <>
      {error && (
        <div className="mb-4 glass px-4 py-3 rounded-lg border-red-500/50 bg-red-500/10 text-red-300">
          ✗ {error}
        </div>
      )}

      {saving && (
        <div className="mb-4 glass px-4 py-3 rounded-lg border-blue-500/50 bg-blue-500/10 text-blue-300 flex items-center gap-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          ⏳ Saving wallet to database...
        </div>
      )}

      {success && (
        <div className="mb-4 glass px-4 py-3 rounded-lg border-green-500/50 bg-green-500/10 text-green-300">
          ✓ Wallet connected and saved!
        </div>
      )}

      {!connectedAddress ? (
        <div className="space-y-4">
          <div className="glass rounded-lg p-4 border-blue-400/30 bg-blue-500/10">
            <p className="text-blue-300 text-sm">
              <strong>🔗 Connect Wallet:</strong> MetaMask (Base, Ethereum) or Phantom (Solana). Your address will be saved to receive payments.
            </p>
          </div>

          <Button
            onClick={handleConnectWallet}
            disabled={loading || saving}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/50"
          >
            {loading ? '⏳ Connecting...' : saving ? '💾 Saving...' : '🔗 Connect Wallet'}
          </Button>

          <p className="text-gray-400 text-sm text-center text-xs">
            Supports MetaMask (EVM chains) and Phantom (Solana)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connected wallet display */}
          <div className="glass rounded-lg p-4 border-green-400/30 bg-green-500/10">
            <p className="text-gray-400 text-sm mb-2">✓ Wallet Connected</p>
            <div className="flex items-center justify-between gap-4">
              <p className="text-white font-mono text-sm">{truncateAddress(connectedAddress)}</p>
              <button
                onClick={() => navigator.clipboard.writeText(connectedAddress)}
                className="px-3 py-2 bg-blue-600/50 hover:bg-blue-700/50 rounded text-sm text-white transition"
                title="Copy address"
              >
                📋
              </button>
            </div>
          </div>

          {!readOnly && (
            <Button
              onClick={handleDisconnectWallet}
              disabled={loading}
              variant="outline"
              className="w-full border-red-500/50 text-red-400 hover:border-red-400/80 hover:text-red-300 hover:bg-red-500/10"
            >
              {loading ? '⏳ Disconnecting...' : '🔓 Disconnect Wallet'}
            </Button>
          )}
        </div>
      )}
    </>
  )
}
