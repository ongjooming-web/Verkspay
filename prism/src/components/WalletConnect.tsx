'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './Button'
import { Card, CardBody, CardHeader } from './Card'

interface WalletConnectProps {
  onWalletConnected?: (address: string) => void
}

const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export function WalletConnectComponent({ onWalletConnected }: WalletConnectProps) {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(isMobileDevice())
    loadWalletData()
    
    // Auto-connect if running inside wallet's built-in browser
    const detectWalletBrowserAndConnect = async () => {
      const isWalletBrowser = !!(window.ethereum) && (
        (window.ethereum as any).isMetaMask || 
        (window.ethereum as any).isPhantom ||
        navigator.userAgent.includes('MetaMaskMobile') ||
        navigator.userAgent.includes('Phantom')
      )
      
      console.log('[WalletConnect] Wallet browser detected:', isWalletBrowser)
      
      if (isWalletBrowser && !connectedAddress) {
        console.log('[WalletConnect] Auto-connecting inside wallet browser...')
        setLoading(true)
        // Small delay to ensure wallet provider is fully ready
        await new Promise(resolve => setTimeout(resolve, 500))
        await handleConnectWallet()
      }
    }
    
    detectWalletBrowserAndConnect()
  }, [connectedAddress])

  const loadWalletData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()

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

  const autoConnectIfReturningFromWallet = async () => {
    // Check if we're returning from wallet app
    const params = new URLSearchParams(window.location.search)
    const isReturningFromWallet = params.has('connect') || params.has('ref')

    if (isReturningFromWallet && window.ethereum) {
      console.log('[WalletConnect] Detected return from wallet app, auto-connecting...')
      // Small delay to ensure wallet provider is ready
      setTimeout(() => handleConnectWallet(), 500)
    }
  }

  const handleConnectWallet = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Check if MetaMask or Phantom is installed
      if (!window.ethereum) {
        setError('No wallet detected. Please install MetaMask or Phantom.')
        setLoading(false)
        return
      }

      console.log('[WalletConnect] Requesting account access from MetaMask/Phantom...')

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

  const handleDeepLink = (wallet: 'metamask' | 'phantom') => {
    const dappUrl = typeof window !== 'undefined' ? window.location.href : 'https://app.prismops.xyz'
    const dappDomain = dappUrl.replace(/https?:\/\//, '').split('/')[0]

    let deepLinkUrl: string

    if (wallet === 'metamask') {
      // MetaMask deep link: https://metamask.app.link/dapp/{dapp-url}
      deepLinkUrl = `https://metamask.app.link/dapp/${dappDomain}`
    } else {
      // Phantom deep link: https://phantom.app/ul/browse/{dapp-url}
      deepLinkUrl = `https://phantom.app/ul/browse/${dappUrl}?ref=${dappUrl}`
    }

    console.log(`[WalletConnect] Redirecting to ${wallet} deep link:`, deepLinkUrl)
    window.location.href = deepLinkUrl
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
              <p className="text-gray-400 text-sm mb-2">Connected Wallet Address</p>
              <p className="text-white font-mono text-sm break-all">{connectedAddress}</p>
              <p className="text-gray-500 text-xs mt-2">
                Clients will send USDC to this address for invoice payments
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
              <p className="text-gray-300 text-sm mb-2">
                Connect your wallet to receive USDC payments for invoices
              </p>
              <ul className="text-gray-400 text-xs space-y-1 ml-4 list-disc">
                <li><strong>MetaMask</strong> - Desktop extension or mobile app</li>
                <li><strong>Phantom</strong> - Desktop extension or mobile app</li>
              </ul>
            </div>

            {/* Auto-connecting state (inside wallet browser) */}
            {loading && (
              <div className="space-y-2">
                <div className="w-full px-4 py-3 rounded-lg font-semibold bg-gray-600/50 text-gray-300 flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Connecting to wallet...</span>
                </div>
                <p className="text-gray-500 text-xs text-center">
                  Please approve the connection in your wallet
                </p>
              </div>
            )}

            {/* Desktop: Use injected provider */}
            {!isMobile && window.ethereum && !loading && (
              <Button
                onClick={handleConnectWallet}
                disabled={saving}
                className={`
                  w-full px-4 py-3 rounded-lg font-semibold transition
                  ${
                    saving
                      ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600'
                  }
                `}
              >
                {saving ? 'Saving...' : 'Connect Wallet'}
              </Button>
            )}

            {/* Mobile without injected provider: Show deep-link buttons */}
            {isMobile && !window.ethereum && !loading && (
              <div className="space-y-2">
                <Button
                  onClick={() => handleDeepLink('metamask')}
                  className="w-full px-4 py-3 rounded-lg font-semibold bg-orange-600/70 hover:bg-orange-700/70 text-white transition"
                >
                  🦊 Open in MetaMask
                </Button>
                <Button
                  onClick={() => handleDeepLink('phantom')}
                  className="w-full px-4 py-3 rounded-lg font-semibold bg-purple-600/70 hover:bg-purple-700/70 text-white transition"
                >
                  👻 Open in Phantom
                </Button>
              </div>
            )}

            {/* Desktop without extension: Show error */}
            {!isMobile && !window.ethereum && (
              <p className="text-red-400 text-xs text-center">
                MetaMask or Phantom extension not found. Please install it as a browser extension.
              </p>
            )}

            {/* Mobile: Explanation */}
            {isMobile && !window.ethereum && (
              <p className="text-gray-500 text-xs text-center">
                Tapping a button above will open the wallet app and redirect back automatically
              </p>
            )}
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
