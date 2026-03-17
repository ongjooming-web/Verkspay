'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { Button } from './Button'
import { Card, CardBody, CardHeader } from './Card'

// Lazy load AppKit component - SSR breaks wallet libs
const WalletConnectAppKit = dynamic(
  () => import('./WalletConnectAppKit').then(mod => ({ default: mod.WalletConnectAppKit })),
  { ssr: false, loading: () => <div className="text-gray-400 text-sm">Loading wallet...</div> }
)

interface WalletConnectProps {
  onWalletConnected?: (address: string) => void
}

export function WalletConnectComponent({ onWalletConnected }: WalletConnectProps) {
  const [useMobile, setUseMobile] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    
    // Detect mobile or lack of window.ethereum
    const isMobileDevice = /iPhone|iPad|Android/i.test(navigator.userAgent)
    const hasEthereum = typeof window !== 'undefined' && !!window.ethereum
    
    // Use AppKit if mobile OR no window.ethereum available
    const shouldUseMobile = isMobileDevice || !hasEthereum
    setUseMobile(shouldUseMobile)
    
    console.log('[WalletConnect] Detection:', {
      isMobileDevice,
      hasEthereum,
      useMobile: shouldUseMobile,
      userAgent: navigator.userAgent
    })
    
    loadWalletData()
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
      console.error('[WalletConnect] Error loading wallet:', err)
    }
  }

  const truncateAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Direct connection via window.ethereum (desktop with MetaMask/Phantom)
  const handleConnectWallet = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Check if MetaMask/Phantom is installed
      if (!window.ethereum) {
        setError('No wallet detected. Please install MetaMask or Phantom.')
        setLoading(false)
        return
      }

      console.log('[WalletConnect] Requesting account access...')

      // Request account access (shows approval prompt in wallet)
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts'
      })) as string[]

      if (!accounts || accounts.length === 0) {
        setError('No accounts found')
        setLoading(false)
        return
      }

      const address = accounts[0]
      console.log('[WalletConnect] Connected address:', address)

      // Sign message for authentication
      const message = `Sign in to Prism
Wallet: ${address}
Timestamp: ${Date.now()}`

      try {
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [message, address]
        }) as string
        console.log('[WalletConnect] Message signed:', signature)
      } catch (signErr) {
        console.warn('[WalletConnect] Message signing failed, continuing without signature:', signErr)
        // Continue without signature - address is already verified by connection
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      // Save to Supabase
      setSaving(true)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_address: address })
        .eq('id', userData.user.id)

      if (updateError) {
        console.error('[WalletConnect] Save error:', updateError)
        setError('Failed to save wallet address')
        setSaving(false)
        setLoading(false)
        return
      }

      console.log('[WalletConnect] Address saved successfully')
      setSaving(false)
      setConnectedAddress(address)
      setSuccess(true)
      setLoading(false)

      if (onWalletConnected) {
        onWalletConnected(address)
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('[WalletConnect] Connection error:', err)
      if (err.code === 4001) {
        setError('Connection cancelled')
      } else {
        setError(err.message || 'Failed to connect wallet')
      }
      setLoading(false)
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
      setConnectedAddress(null)
      setSuccess(false)
    } catch (err) {
      console.error('[WalletConnect] Disconnect error:', err)
    }
  }

  // Return AppKit component for mobile, direct ethereum for desktop
  if (!isMounted) {
    return null
  }

  if (useMobile) {
    return <WalletConnectAppKit onWalletConnected={onWalletConnected} />
  }

  return (
    <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
      <CardHeader>
        <h3 className="text-lg font-semibold text-white">🔐 Connect Wallet</h3>
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
                Click below to connect your MetaMask or Phantom wallet. You'll approve the connection in your wallet.
              </p>
            </div>

            <Button
              onClick={handleConnectWallet}
              disabled={loading || saving}
              className={`
                w-full px-4 py-3 rounded-lg font-semibold transition
                ${
                  loading || saving
                    ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600'
                }
              `}
            >
              {loading ? 'Waiting for wallet...' : saving ? 'Saving...' : 'Connect Wallet'}
            </Button>

            <p className="text-gray-500 text-xs text-center">
              Make sure you have MetaMask or Phantom installed
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

export { WalletConnectComponent as default }
