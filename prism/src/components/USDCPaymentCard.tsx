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
  onPaymentMarked?: () => void
}

export function USDCPaymentCard({
  invoiceId,
  invoiceAmount,
  invoiceNumber,
  status = 'pending',
  onPaymentMarked
}: USDCPaymentCardProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false)
  const [markAsPayedError, setMarkAsPayedError] = useState<string | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  useEffect(() => {
    loadWalletAddress()
  }, [invoiceId])

  /**
   * Load wallet address from user's profile
   */
  const loadWalletAddress = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      // Get saved wallet address
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', userData.user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        setError('Failed to load wallet')
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
    } catch (err: any) {
      console.error('Error loading wallet:', err)
      setError('Failed to load payment information')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Mark invoice as paid and refresh
   */
  const handleMarkAsPaid = async () => {
    setIsMarkingAsPaid(true)
    setMarkAsPayedError(null)
    setShowSuccessMessage(false)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) {
        setMarkAsPayedError('User not authenticated')
        setIsMarkingAsPaid(false)
        return
      }

      if (!walletAddress) {
        setMarkAsPayedError('Wallet address not found')
        setIsMarkingAsPaid(false)
        return
      }

      // Get auth session for token
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        setMarkAsPayedError('Authentication failed')
        setIsMarkingAsPaid(false)
        return
      }

      console.log('[USDCPaymentCard] Marking invoice as paid:', invoiceId)

      // Call the mark-paid endpoint
      const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setMarkAsPayedError(data.error || 'Failed to mark invoice as paid')
        setIsMarkingAsPaid(false)
        return
      }

      console.log('[USDCPaymentCard] Invoice marked as paid successfully')

      // Show success
      setShowSuccessMessage(true)

      // Trigger parent refresh
      if (onPaymentMarked) {
        console.log('[USDCPaymentCard] Refreshing parent component')
        onPaymentMarked()
      }

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false)
      }, 3000)
    } catch (err: any) {
      console.error('[USDCPaymentCard] Error marking as paid:', err)
      setMarkAsPayedError(err.message || 'An error occurred')
    } finally {
      setIsMarkingAsPaid(false)
    }
  }

  // Don't show payment card if already paid
  if (status === 'paid') {
    return null
  }

  // Show loading state
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

  // Show error if wallet not connected
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

  // Don't show if no wallet
  if (!walletAddress) {
    return null
  }

  return (
    <Card className="mb-6 border-green-500/30 bg-gradient-to-r from-green-500/5 to-blue-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">💳 Send Payment</h2>
            <p className="text-gray-400 text-sm mt-1">Pay with Stripe bank account</p>
          </div>
          <span className="text-3xl">✓</span>
        </div>
      </CardHeader>
      <CardBody className="space-y-6">
        {/* Payment ready badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/50 rounded-lg w-fit">
          <span className="text-green-400 text-lg">●</span>
          <span className="text-green-300 font-semibold text-sm">Recipient Address (USD)</span>
        </div>

        {/* Amount display */}
        <div>
          <p className="text-gray-400 text-sm mb-2">Amount</p>
          <p className="text-3xl font-bold text-blue-400">
            ${invoiceAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
          </p>
        </div>

        {/* Recipient address (with QR code toggle) */}
        <div className="space-y-3">
          <p className="text-gray-400 text-sm font-semibold">Recipient Address (USD):</p>
          
          <div className="glass rounded-lg p-4 border-blue-400/30 flex items-center gap-2">
            <code className="flex-1 text-white font-mono text-xs break-all">
              {walletAddress}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(walletAddress)}
              className="px-3 py-2 bg-blue-600/50 hover:bg-blue-700/50 rounded text-sm text-white transition whitespace-nowrap"
              title="Copy address"
            >
              📋 Copy
            </button>
          </div>

          {/* QR Code toggle */}
          <button
            onClick={() => setShowQR(!showQR)}
            className="w-full px-4 py-2 glass rounded-lg text-white hover:bg-white/10 transition text-sm flex items-center justify-center gap-2"
          >
            <span>{showQR ? '▼ Hide QR Code' : '▶ Show QR Code'}</span>
            <span>📱</span>
          </button>

          {showQR && (
            <div className="mt-4">
              <QRCodeDisplay
                walletAddress={walletAddress}
                amount={invoiceAmount}
                network="base"
                currency="USDC"
              />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="glass rounded-lg p-4 border-blue-400/30">
          <h3 className="text-white font-semibold mb-3">📝 Steps</h3>
          <ol className="space-y-2 text-gray-300 text-sm">
            <li><span className="text-blue-400 font-bold">1.</span> Copy or scan the wallet address above</li>
            <li><span className="text-blue-400 font-bold">2.</span> Open your wallet (MetaMask, Phantom, etc.)</li>
            <li><span className="text-blue-400 font-bold">3.</span> Send {invoiceAmount} USDC to the address</li>
            <li><span className="text-blue-400 font-bold">4.</span> After payment confirms, click "Mark as Paid" below</li>
          </ol>
        </div>

        {/* Info */}
        <div className="flex gap-4 text-sm text-gray-400">
          <div className="flex items-start gap-2">
            <span>💡</span>
            <span>No intermediaries — funds go directly to this wallet</span>
          </div>
        </div>

        {/* Error message */}
        {markAsPayedError && (
          <div className="glass rounded-lg p-4 border-red-500/30 bg-red-500/10">
            <p className="text-red-300 text-sm">
              <span className="font-bold">❌ Error:</span> {markAsPayedError}
            </p>
          </div>
        )}

        {/* Success message */}
        {showSuccessMessage && (
          <div className="glass rounded-lg p-4 border-green-500/30 bg-green-500/10">
            <p className="text-green-300 text-sm">
              <span className="font-bold">✓ Success!</span> Invoice marked as paid
            </p>
          </div>
        )}

        {/* Mark as Paid button */}
        <div className="pt-4 border-t border-white/10">
          <p className="text-gray-400 text-sm mb-3">
            ✓ <strong>Received payment?</strong> Mark the invoice as paid:
          </p>
          <button
            onClick={handleMarkAsPaid}
            disabled={isMarkingAsPaid}
            className={`
              w-full px-4 py-3 rounded-lg font-semibold transition
              flex items-center justify-center gap-2
              ${
                isMarkingAsPaid
                  ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 hover:shadow-lg hover:shadow-green-500/50'
              }
            `}
          >
            {isMarkingAsPaid ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Mark as Paid</span>
              </>
            )}
          </button>
        </div>
      </CardBody>
    </Card>
  )
}
