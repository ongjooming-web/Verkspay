'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './Button'
import { Card, CardBody, CardHeader } from './Card'

interface WalletConnectProps {
  onWalletConnected?: (address: string) => void
}

export function WalletConnectComponent({ onWalletConnected }: WalletConnectProps) {
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

  const handleConnectWallet = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const isMobile = /iPhone|Android/i.test(navigator.userAgent)
      let provider

      if (isMobile || !window.ethereum) {
        // Mobile or no injected provider: use WalletConnect
        const EthereumProvider = (await import('@walletconnect/ethereum-provider')).EthereumProvider

        provider = await EthereumProvider.init({
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
          chains: [1, 8453], // Ethereum, Base
          optionalChains: [137, 56, 43114], // Polygon, BSC, Avalanche
          methods: ['eth_sendTransaction', 'eth_signTransaction', 'personal_sign', 'eth_sign', 'eth_signTypedData', 'eth_signTypedData_v4'],
          events: ['chainChanged', 'accountsChanged'],
          showQrModal: true
        })

        // Connect and get accounts
        const accounts = await provider.connect()
        
        // If connect returns accounts, use them; otherwise get from provider state
        let address: string
        if (Array.isArray(accounts) && accounts.length > 0) {
          address = accounts[0]
        } else if (provider.accounts && provider.accounts.length > 0) {
          address = provider.accounts[0]
        } else {
          // Try requesting accounts directly
          const requestedAccounts = (await provider.request({
            method: 'eth_accounts'
          })) as string[]
          
          if (!requestedAccounts || requestedAccounts.length === 0) {
            setError('No accounts found. Please approve connection in your wallet.')
            setLoading(false)
            return
          }
          address = requestedAccounts[0]
        }

        console.log('[WalletConnect] Connected via WalletConnect:', address)

        // Sign message for auth with chainId
        const message = `Sign in to Prism\nWallet: ${address}\nTimestamp: ${Date.now()}`
        const signature = (await provider.request(
          {
            method: 'personal_sign',
            params: [message, address]
          },
          1
        )) as string

        await saveWalletAddress(address, signature)
      } else {
        // Desktop with injected provider: use window.ethereum directly
        console.log('[WalletConnect] Using window.ethereum (MetaMask/Phantom)')

        const accounts = (await window.ethereum.request({
          method: 'eth_requestAccounts'
        })) as string[]

        if (!accounts || accounts.length === 0) {
          setError('No accounts found')
          setLoading(false)
          return
        }

        const address = accounts[0]
        console.log('[WalletConnect] Connected via window.ethereum:', address)

        // Sign message for auth
        const message = `Sign in to Prism\nWallet: ${address}\nTimestamp: ${Date.now()}`
        const signature = (await window.ethereum.request({
          method: 'personal_sign',
          params: [message, address]
        })) as string

        await saveWalletAddress(address, signature)
      }
    } catch (err: any) {
      console.error('[WalletConnect] Connection error:', err)
      if (err.code === 4001 || err.message?.includes('User rejected')) {
        setError('Connection cancelled by user')
      } else {
        setError(err.message || 'Failed to connect wallet')
      }
      setLoading(false)
    }
  }

  const saveWalletAddress = async (address: string, signature: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      setSaving(true)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_address: address,
          wallet_signature: signature,
          wallet_signed_at: new Date().toISOString()
        })
        .eq('id', userData.user.id)

      if (updateError) {
        console.error('[WalletConnect] Save error:', updateError)
        setError('Failed to save wallet address')
        setSaving(false)
        setLoading(false)
        return
      }

      console.log('[WalletConnect] Wallet saved successfully')
      setSaving(false)
      setConnectedAddress(address)
      setSuccess(true)
      setLoading(false)

      if (onWalletConnected) {
        onWalletConnected(address)
      }

      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('[WalletConnect] Save error:', err)
      setError(err.message || 'Failed to save wallet')
      setSaving(false)
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.id) {
        await supabase
          .from('profiles')
          .update({ wallet_address: null, wallet_signature: null })
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
                <li><strong>Desktop:</strong> MetaMask, Phantom, or any EVM wallet</li>
                <li><strong>Mobile:</strong> WalletConnect opens your wallet app (300+ supported)</li>
              </ul>
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
              {loading ? 'Opening wallet...' : saving ? 'Saving...' : 'Connect Wallet'}
            </Button>
          </>
        )}

        {success && (
          <div className="glass rounded-lg p-4 border-green-500/30 bg-green-500/10">
            <p className="text-green-300 text-sm">
              <span className="font-bold">✓ Success!</span> Wallet connected and authenticated
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export { WalletConnectComponent as default }
