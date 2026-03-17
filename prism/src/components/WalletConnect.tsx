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

const isInsideWalletBrowser = (): boolean => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const eth = (window as any).ethereum
  return !!(
    eth?.isMetaMask ||
    eth?.isPhantom ||
    ua.includes('MetaMaskMobile') ||
    ua.includes('Phantom')
  )
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

    // Detect if running inside MetaMask or Phantom built-in browser
    // window.ethereum may not be injected yet — poll briefly
    const checkWalletBrowser = async () => {
      let attempts = 0
      while (attempts < 15) {
        if (isInsideWalletBrowser()) {
          setInsideWalletBrowser(true)
          return
        }
        await new Promise(r => setTimeout(r, 100))
        attempts++
      }
    }
    checkWalletBrowser()
  }, [])

  const loadWalletData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) return
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
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!(window as any).ethereum) {
        setError('No wallet detected.')
        setLoading(false)
        return
      }

      const accounts = (await (window as any).ethereum.request({
        method: 'eth_requestAccounts'
      })) as string[]

      if (!accounts || accounts.length === 0) {
        setError('No accounts found')
        setLoading(false)
        return
      }

      const address = accounts[0]

      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      setSaving(true)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_address: address })
        .eq('id', userData.user.id)

      if (updateError) {
        setError('Failed to save wallet address')
        setSaving(false)
        setLoading(false)
        return
      }

      setSaving(false)
      setConnectedAddress(address)
      setSuccess(true)
      setLoading(false)
      if (onWalletConnected) onWalletConnected(address)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Connection cancelled')
      } else {
        setError(err.message || 'Failed to connect wallet')
      }
      setLoading(false)
      setSaving(false)
    }
  }, [onWalletConnected])

  const handleDeepLink = (wallet: 'metamask' | 'phantom') => {
    // Get current page URL without query params
    const base = window.location.origin + window.location.pathname

    if (wallet === 'metamask') {
      // MetaMask: https://metamask.app.link/dapp/{domain-and-path}?autoconnect=true
      const domainAndPath = base.replace(/^https?:\/\//, '')
      window.location.href = `https://metamask.app.link/dapp/${domainAndPath}?autoconnect=true`
    } else {
      // Phantom: https://phantom.app/ul/browse/{encoded-url}?autoconnect=true&ref={encoded-url}
      window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(base)}?autoconnect=true&ref=${encodeURIComponent(base)}`
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
                  className={`w-full px-4 py-4 rounded-lg font-bold text-base transition ${
                    loading || saving
                      ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 shadow-lg'
                  }`}
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

                {/* Desktop with extension */}
                {!isMobile && (window as any).ethereum && (
                  <Button
                    onClick={handleConnectWallet}
                    disabled={loading || saving}
                    className={`w-full px-4 py-3 rounded-lg font-semibold transition ${
                      loading || saving
                        ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600'
                    }`}
                  >
                    {loading ? 'Approving...' : saving ? 'Saving...' : 'Connect Wallet'}
                  </Button>
                )}

                {/* Desktop without extension */}
                {!isMobile && !(window as any).ethereum && (
                  <p className="text-red-400 text-xs text-center">
                    MetaMask or Phantom extension not found. Please install it as a browser extension.
                  </p>
                )}

                {/* Mobile: deep-link buttons */}
                {isMobile && (
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
                    <p className="text-gray-500 text-xs text-center">
                      Opens your wallet app to connect
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {success && (
          <div className="glass rounded-lg p-4 border-green-500/30 bg-green-500/10">
            <p className="text-green-300 text-sm"><span className="font-bold">✓ Success!</span> Wallet connected</p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export { WalletConnectComponent as default }
