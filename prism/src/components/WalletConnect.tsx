'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [insideWalletBrowser, setInsideWalletBrowser] = useState(false)

  useEffect(() => {
    setIsMobile(isMobileDevice())
    loadWalletData()

    // Check for autoconnect URL parameter (set by deep-link from wallet app)
    const searchParams = new URLSearchParams(window.location.search)
    const autoconnect = searchParams.get('autoconnect') === 'true'

    console.log('[WalletConnect] autoconnect param:', autoconnect, 'window.ethereum:', !!window.ethereum)

    if (autoconnect && window.ethereum) {
      console.log('[WalletConnect] Inside wallet browser, showing tap-to-connect button')
      setInsideWalletBrowser(true)
    }
  }, [])

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

  const handleConnectWallet = useCallback(async () => {
    console.log('[WalletConnect] handleConnectWallet called')
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      console.log('[WalletConnect] Checking for window.ethereum...')
      if (!window.ethereum) {
        console.log('[WalletConnect] No window.ethereum found')
        setError('No wallet detected. Please install MetaMask or Phantom.')
        setLoading(false)
        return
      }

      console.log('[WalletConnect] window.ethereum found, requesting account access...')
      console.log('[WalletConnect] Calling eth_requestAccounts...')

      // Request account access (shows approval prompt in wallet)
      // This MUST be called from a user gesture (click/tap), not from useEffect
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts'
      })) as string[]

      console.log('[WalletConnect] eth_requestAccounts returned:', accounts)

      if (!accounts || accounts.length === 0) {
        console.log('[WalletConnect] No accounts returned')
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
  }, [onWalletConnected])

  const handleDeepLink = (wallet: 'metamask' | 'phantom') => {
    const base = typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://app.prismops.xyz'
    const domainAndPath = base.replace(/^https?:\/\//, '')

    let deepLinkUrl: string

    if (wallet === 'metamask') {
      // MetaMask deep link: https://metamask.app.link/dapp/{domain-and-path}?autoconnect=true
      deepLinkUrl = `https://metamask.app.link/dapp/${domainAndPath}?autoconnect=true`
    } else {
      // Phantom deep link: https://phantom.app/ul/browse/{encoded-url}?ref={encoded-url}
      deepLinkUrl = `https://phantom.app/ul/browse/${encodeURIComponent(base)}?autoconnect=true&ref=${encodeURIComponent(base)}`
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

            {/* Inside MetaMask/Phantom built-in browser */}
            {insideWalletBrowser ? (
              <div className="space-y-3">
                <div className="glass rounded-lg p-4 border-green-400/30 bg-green-500/10">
                  <p className="text-green-300 text-sm font-semibold">
                    ✅ Wallet detected! Tap below to connect.
                  </p>
                </div>

                <Button
                  onClick={handleConnectWallet}
                  disabled={loading || saving}
                  className={`
                    w-full px-4 py-4 rounded-lg font-bold text-base transition
                    ${
                      loading || saving
                        ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 shadow-lg'
                    }
                  `}
                >
                  {loading ? 'Connecting...' : saving ? 'Saving...' : '👆 Tap to Connect & Sign'}
                </Button>
              </div>
            ) : (
              <>
                <div className="glass rounded-lg p-4 border-blue-400/30">
                  <p className="text-gray-300 text-sm mb-2">
                    Connect your wallet to receive USDC payments for invoices
                  </p>
                  <ul className="text-gray-400 text-xs space-y-1 ml-4 list-disc">
                    <li><strong>MetaMask</strong> - Desktop extension or mobile app</li>
                    <li><strong>Phantom</strong> - Desktop extension or mobile app</li>
                  </ul>
                </div>

                {/* Desktop: Use injected provider */}
                {!isMobile && window.ethereum && (
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
                    {loading ? 'Approving in wallet...' : saving ? 'Saving...' : 'Connect Wallet'}
                  </Button>
                )}

                {/* Mobile without injected provider: Show deep-link buttons */}
                {isMobile && !window.ethereum && (
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
                    Tap a button above to open the wallet app and complete setup
                  </p>
                )}
              </>
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
