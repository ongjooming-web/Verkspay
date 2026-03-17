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

export function WalletConnectComponent({
  onWalletConnected,
  onWalletDisconnected,
  readOnly = false
}: WalletConnectProps) {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<'base' | 'ethereum' | 'solana'>('base')
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Network chain IDs
  const NETWORK_CONFIGS = {
    base: { chainId: 8453, name: 'Base', rpc: 'https://mainnet.base.org' },
    ethereum: { chainId: 1, name: 'Ethereum Mainnet', rpc: 'https://eth.drpc.org' },
    solana: { chainId: 0, name: 'Solana', rpc: 'https://api.mainnet-beta.solana.com' }
  }

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address, usdc_network')
        .eq('id', userData.user.id)
        .single()

      if (profile?.wallet_address) {
        setConnectedAddress(profile.wallet_address)
        if (profile.usdc_network) {
          setSelectedNetwork(profile.usdc_network)
        }
      }
    } catch (err: any) {
      console.error('Error loading wallet data:', err)
      setError('Failed to load wallet data')
    } finally {
      setLoading(false)
    }
  }

  const truncateAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const handleConnectWallet = async () => {
    setConnecting(true)
    setError(null)
    setSuccess(false)

    try {
      // Check if window.ethereum exists (MetaMask)
      if (typeof window === 'undefined') {
        throw new Error('Wallet connection requires browser environment')
      }

      // For now, we'll implement a simple wallet connection flow
      // In production, use @walletconnect/modal properly
      const mockAddress = await requestWalletConnection()
      
      if (!mockAddress) {
        throw new Error('User rejected wallet connection')
      }

      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(mockAddress)) {
        throw new Error('Invalid Ethereum address format')
      }

      // Save to Supabase
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_address: mockAddress,
          usdc_network: selectedNetwork,
          payment_method: 'usdc',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setConnectedAddress(mockAddress)
      setSuccess(true)
      
      if (onWalletConnected) {
        onWalletConnected(mockAddress, selectedNetwork)
      }

      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Wallet connection error:', err)
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setConnecting(false)
    }
  }

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

  const handleNetworkChange = (newNetwork: 'base' | 'ethereum' | 'solana') => {
    setSelectedNetwork(newNetwork)
    // If wallet is connected, we'd switch networks here
    if (connectedAddress) {
      // In production, this would trigger a network switch in the wallet
      console.log(`Switching to ${newNetwork}`)
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

      {success && (
        <div className="mb-4 glass px-4 py-3 rounded-lg border-green-500/50 bg-green-500/10 text-green-300">
          ✓ Wallet connected successfully!
        </div>
      )}

      {!connectedAddress ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Network</label>
            <select
              value={selectedNetwork}
              onChange={(e) => handleNetworkChange(e.target.value as any)}
              disabled={readOnly}
              className="glass px-4 py-3 rounded-lg text-white w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 appearance-none disabled:opacity-50"
            >
              <option value="base" className="bg-slate-900">⚡ Base (Recommended - Fast & Cheap)</option>
              <option value="ethereum" className="bg-slate-900">Ξ Ethereum (Mainnet)</option>
              <option value="solana" className="bg-slate-900">◎ Solana</option>
            </select>
            <p className="text-gray-400 text-xs mt-2">
              {selectedNetwork === 'base' && 'Base offers the fastest and cheapest USDC transactions'}
              {selectedNetwork === 'ethereum' && 'Ethereum mainnet is fully decentralized'}
              {selectedNetwork === 'solana' && 'Solana offers high throughput and low fees'}
            </p>
          </div>

          <Button
            onClick={handleConnectWallet}
            disabled={connecting || loading || readOnly}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/50"
          >
            {connecting ? '⏳ Connecting...' : '🔗 Connect Wallet'}
          </Button>
          <p className="text-gray-400 text-sm text-center">
            Supports MetaMask, Phantom, and WalletConnect
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass rounded-lg p-4 border-green-400/30 bg-green-500/10">
            <p className="text-gray-400 text-sm mb-2">Connected Wallet</p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-mono text-sm">{truncateAddress(connectedAddress)}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Network: <span className="text-blue-300 font-semibold">{NETWORK_CONFIGS[selectedNetwork].name}</span>
                </p>
              </div>
              <span className="text-2xl">✓</span>
            </div>
          </div>

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
          </div>

          <div className="glass rounded-lg p-4 border-amber-400/30 bg-amber-500/10">
            <p className="text-amber-300 text-sm">
              💡 <strong>Tip:</strong> Your wallet address is visible to invoice senders. Use a dedicated wallet for invoicing.
            </p>
          </div>

          {!readOnly && (
            <Button
              onClick={handleDisconnectWallet}
              disabled={connecting}
              variant="outline"
              className="w-full border-red-500/50 text-red-400 hover:border-red-400/80 hover:text-red-300 hover:bg-red-500/10"
            >
              {connecting ? '⏳ Disconnecting...' : '🔓 Disconnect Wallet'}
            </Button>
          )}
        </div>
      )}
    </>
  )
}

// Simple wallet connection request - in production, integrate with @walletconnect/modal
async function requestWalletConnection(): Promise<string | null> {
  return new Promise((resolve) => {
    // For demo purposes, show a simple input dialog
    // In production, this would use @walletconnect/modal or MetaMask provider
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: 'eth_requestAccounts' })
        .then((accounts: string[]) => resolve(accounts[0] || null))
        .catch(() => resolve(null))
    } else {
      // Fallback: ask user to input address
      const address = prompt('Enter your wallet address (0x...):')
      resolve(address)
    }
  })
}
