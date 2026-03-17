'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardBody, CardHeader } from './Card'
import { QRCodeDisplay } from './QRCodeDisplay'

interface USDCPaymentCardProps {
  invoiceId: string
  invoiceAmount: number
  invoiceNumber: string
  status?: string
}

export function USDCPaymentCard({
  invoiceId,
  invoiceAmount,
  invoiceNumber,
  status = 'pending'
}: USDCPaymentCardProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [network, setNetwork] = useState<'base' | 'ethereum' | 'solana'>('base')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentIntent, setPaymentIntent] = useState<any>(null)
  const [showQR, setShowQR] = useState(false)

  const NETWORK_INFO = {
    base: {
      name: '⚡ Base',
      description: 'Fastest & cheapest',
      color: 'from-blue-600 to-blue-400'
    },
    ethereum: {
      name: 'Ξ Ethereum',
      description: 'Full decentralization',
      color: 'from-purple-600 to-purple-400'
    },
    solana: {
      name: '◎ Solana',
      description: 'High speed',
      color: 'from-green-600 to-green-400'
    }
  }

  useEffect(() => {
    loadPaymentData()
  }, [invoiceId])

  const loadPaymentData = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      // Fetch user's wallet address and network preference
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_address, usdc_network')
        .eq('id', userData.user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        setWalletAddress(null)
        setLoading(false)
        return
      }

      if (!profile?.wallet_address) {
        setError('Wallet not connected. Please connect a wallet in Settings to receive USDC payments.')
        setWalletAddress(null)
        setLoading(false)
        return
      }

      setWalletAddress(profile.wallet_address)
      if (profile.usdc_network) {
        setNetwork(profile.usdc_network as any)
      }

      // Try to fetch or create payment intent
      const { data: intent, error: intentError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('invoice_id', invoiceId)
        .single()

      if (intent) {
        setPaymentIntent(intent)
      } else if (intentError?.code === 'PGRST116') {
        // No record found, create one
        const { data: newIntent, error: createError } = await supabase
          .from('payment_intents')
          .insert([
            {
              user_id: userData.user.id,
              invoice_id: invoiceId,
              wallet_address: profile.wallet_address,
              amount_usdc: invoiceAmount,
              network: profile.usdc_network || 'base',
              status: 'pending'
            }
          ])
          .select()
          .single()

        if (newIntent) {
          setPaymentIntent(newIntent)
        } else if (createError) {
          console.error('Create intent error:', createError)
        }
      }
    } catch (err: any) {
      console.error('Payment data error:', err)
      setError('Failed to load payment information')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'paid') {
    return null
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <p className="text-gray-300 ml-4">Loading payment options...</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mb-6 border-amber-500/30 bg-amber-500/10">
        <CardBody>
          <p className="text-amber-300 text-sm">
            <span className="font-bold">ℹ️ USDC Payment Unavailable:</span> {error}
          </p>
        </CardBody>
      </Card>
    )
  }

  if (!walletAddress) {
    return null
  }

  return (
    <Card className="mb-6 border-green-500/30 bg-gradient-to-r from-green-500/5 to-blue-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">💰 Pay with USDC</h2>
            <p className="text-gray-400 text-sm mt-1">Non-custodial blockchain payment</p>
          </div>
          <span className="text-3xl">✓</span>
        </div>
      </CardHeader>
      <CardBody className="space-y-6">
        {/* Payment ready badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/50 rounded-lg w-fit">
          <span className="text-green-400 text-lg">●</span>
          <span className="text-green-300 font-semibold text-sm">USDC Payment Ready</span>
        </div>

        {/* Amount display */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm mb-2">Amount in USDC</p>
            <p className="text-3xl font-bold text-blue-400">
              {invoiceAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2">Network</p>
            <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${NETWORK_INFO[network].color} text-white font-semibold text-center`}>
              {NETWORK_INFO[network].name}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="glass rounded-lg p-4 border-blue-400/30">
          <h3 className="text-white font-semibold mb-3">📝 Payment Instructions</h3>
          <ol className="space-y-2 text-gray-300 text-sm">
            <li>
              <span className="text-blue-400 font-bold">1.</span> Use your wallet to send{' '}
              <span className="font-mono bg-black/30 px-2 py-1 rounded">{invoiceAmount} USDC</span>
            </li>
            <li>
              <span className="text-blue-400 font-bold">2.</span> Scan the QR code below or copy the address
            </li>
            <li>
              <span className="text-blue-400 font-bold">3.</span> Send from {NETWORK_INFO[network].name} network
            </li>
            <li>
              <span className="text-blue-400 font-bold">4.</span> Payment will be automatically confirmed once received
            </li>
          </ol>
        </div>

        {/* QR Code section */}
        <div>
          <button
            onClick={() => setShowQR(!showQR)}
            className="w-full px-4 py-3 glass rounded-lg text-white hover:bg-white/10 transition font-semibold flex items-center justify-between"
          >
            <span>
              {showQR ? '▼ Hide QR Code' : '▶ Show QR Code'}
            </span>
            <span className="text-xl">📱</span>
          </button>

          {showQR && (
            <div className="mt-4">
              <QRCodeDisplay
                walletAddress={walletAddress}
                amount={invoiceAmount}
                network={network}
                currency="USDC"
              />
            </div>
          )}
        </div>

        {/* Send instructions with address */}
        {!showQR && (
          <div className="glass rounded-lg p-4 border-blue-400/30">
            <p className="text-gray-400 text-sm mb-3">Send USDC to this address:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-white font-mono text-sm break-all bg-black/30 rounded px-3 py-2">
                {walletAddress}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(walletAddress)}
                className="px-3 py-2 bg-blue-600/50 hover:bg-blue-700/50 rounded text-sm text-white transition"
                title="Copy address"
              >
                📋
              </button>
            </div>
          </div>
        )}

        {/* Additional info */}
        <div className="flex gap-4 text-sm text-gray-400">
          <div className="flex items-start gap-2">
            <span>💡</span>
            <span>No intermediaries - funds go directly to your wallet</span>
          </div>
        </div>
        <div className="flex gap-4 text-sm text-gray-400">
          <div className="flex items-start gap-2">
            <span>⏱️</span>
            <span>Payment link valid for 24 hours</span>
          </div>
        </div>

        {/* Network fee info */}
        <div className="glass rounded-lg p-3 border-amber-400/30 bg-amber-500/10">
          <p className="text-amber-300 text-sm">
            <strong>Note:</strong> {network === 'base' ? 'Base has minimal transaction fees (~$0.01)' : network === 'ethereum' ? 'Ethereum fees vary by network congestion' : 'Solana has low transaction fees (~$0.00025)'}
          </p>
        </div>
      </CardBody>
    </Card>
  )
}
