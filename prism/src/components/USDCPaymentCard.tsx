'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardBody, CardHeader } from './Card'

interface PaymentCardProps {
  invoiceId: string
  invoiceAmount: number
  invoiceNumber: string
  status?: string
  onPaymentMarked?: () => void
}

export function PaymentCard({
  invoiceId,
  invoiceAmount,
  invoiceNumber,
  status = 'pending',
  onPaymentMarked
}: PaymentCardProps) {
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'crypto' | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [recipientName, setRecipientName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false)
  const [markAsPayedError, setMarkAsPayedError] = useState<string | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  useEffect(() => {
    loadPaymentDetails()
  }, [invoiceId])

  /**
   * Load payment details from user's profile
   */
  const loadPaymentDetails = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      // Get profile with all payment method fields
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_address, payment_method, stripe_account_id, stripe_onboarding_complete, full_name')
        .eq('id', userData.user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        setError('Failed to load payment details')
        setLoading(false)
        return
      }

      // Determine which payment method to use based on profile.payment_method field
      if (profile?.payment_method === 'bank') {
        // User has Stripe as primary payment method
        if (profile?.stripe_account_id && profile?.stripe_onboarding_complete) {
          // Stripe connected and fully verified
          setPaymentMethod('bank')
          setStripeAccountId(profile.stripe_account_id)
          setRecipientName(profile.full_name || userData.user.email || 'Your Account')
        } else {
          // Stripe selected but not fully connected
          setError('Stripe account not fully connected. Please complete verification in Settings.')
          setLoading(false)
          return
        }
      } else if (profile?.payment_method === 'crypto' && profile?.wallet_address) {
        // User has wallet as primary payment method
        setPaymentMethod('crypto')
        setWalletAddress(profile.wallet_address)
      } else if (profile?.wallet_address) {
        // Fallback to wallet if no payment method specified
        setPaymentMethod('crypto')
        setWalletAddress(profile.wallet_address)
      } else {
        setError('No payment method connected. Please connect Stripe or a wallet in Settings.')
        setLoading(false)
        return
      }
    } catch (err: any) {
      console.error('Error loading payment details:', err)
      setError('Failed to load payment information')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Mark invoice as paid
   */
  const handleMarkAsPaid = async () => {
    setIsMarkingAsPaid(true)
    setMarkAsPayedError(null)

    try {
      console.log('[PaymentCard] Getting current session...')
      
      // First, just get the current session without refreshing
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('[PaymentCard] Session error:', sessionError)
        setMarkAsPayedError('Failed to get session. Please try again.')
        setIsMarkingAsPaid(false)
        return
      }
      
      let accessToken = session?.access_token
      
      if (!accessToken) {
        console.log('[PaymentCard] No session found, attempting refresh...')
        // Try to refresh if no session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError || !refreshData.session?.access_token) {
          console.error('[PaymentCard] Refresh failed:', refreshError)
          setMarkAsPayedError('Session expired. Please refresh the page and try again.')
          setIsMarkingAsPaid(false)
          return
        }
        accessToken = refreshData.session.access_token
      }

      console.log('[PaymentCard] Got access token, length:', accessToken.length)
      console.log('[PaymentCard] Marking invoice as paid:', invoiceId)

      // Call the mark-paid endpoint with refreshed token
      console.log('[PaymentCard] Sending mark-paid request with token')
      const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      console.log('[PaymentCard] Mark-paid response status:', response.status)

      const data = await response.json()

      if (!response.ok) {
        setMarkAsPayedError(data.error || 'Failed to mark invoice as paid')
        setIsMarkingAsPaid(false)
        return
      }

      console.log('[PaymentCard] Invoice marked as paid successfully')

      // Show success
      setShowSuccessMessage(true)

      // Trigger parent refresh
      if (onPaymentMarked) {
        console.log('[PaymentCard] Refreshing parent component')
        onPaymentMarked()
      }

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false)
      }, 3000)
    } catch (err: any) {
      console.error('[PaymentCard] Error marking as paid:', err)
      setMarkAsPayedError(err.message || 'An error occurred')
    } finally {
      setIsMarkingAsPaid(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <Card className="mb-6 border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <CardBody>
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            <span className="text-gray-400 text-sm">Loading payment details...</span>
          </div>
        </CardBody>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className="mb-6 border-red-500/30 bg-gradient-to-r from-red-500/5 to-red-500/10">
        <CardBody>
          <p className="text-red-300 text-sm">
            <span className="font-bold">❌ Error:</span> {error}
          </p>
        </CardBody>
      </Card>
    )
  }

  // Don't show if no payment method
  if (!paymentMethod) {
    return null
  }

  // Stripe Bank Payment Card
  if (paymentMethod === 'bank' && stripeAccountId) {
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
          {/* Payment method badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/50 rounded-lg w-fit">
            <span className="text-green-400 text-lg">●</span>
            <span className="text-green-300 font-semibold text-sm">Stripe Bank Transfer</span>
          </div>

          {/* Amount */}
          <div>
            <p className="text-gray-400 text-sm mb-2">Amount</p>
            <p className="text-3xl font-bold text-blue-400">
              ${invoiceAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
            </p>
          </div>

          {/* Recipient details */}
          <div className="space-y-4">
            {/* Recipient name */}
            <div>
              <p className="text-gray-400 text-sm mb-2">Recipient</p>
              <div className="glass rounded-lg p-3 border-blue-400/30">
                <p className="text-white text-sm">{recipientName}</p>
              </div>
            </div>

            {/* Stripe account ID */}
            <div>
              <p className="text-gray-400 text-sm mb-2">Stripe Account</p>
              <div className="glass rounded-lg p-3 border-blue-400/30 flex items-center gap-2">
                <code className="flex-1 text-white font-mono text-xs break-all">
                  {stripeAccountId}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(stripeAccountId)}
                  className="px-3 py-2 bg-blue-600/50 hover:bg-blue-700/50 rounded text-sm text-white transition whitespace-nowrap"
                  title="Copy account ID"
                >
                  📋 Copy
                </button>
              </div>
            </div>
          </div>

          {/* Mark as paid section */}
          <div className="border-t border-gray-700 pt-6">
            <p className="text-gray-400 text-sm mb-4">
              Once payment is sent, mark the invoice as paid:
            </p>

            {markAsPayedError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-red-300 text-sm">{markAsPayedError}</p>
              </div>
            )}

            <button
              onClick={handleMarkAsPaid}
              disabled={isMarkingAsPaid}
              className={`
                w-full px-4 py-2 rounded-lg font-semibold transition
                ${
                  isMarkingAsPaid
                    ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600'
                }
              `}
            >
              {isMarkingAsPaid ? 'Marking as paid...' : '✓ Mark as Paid'}
            </button>
          </div>

          {showSuccessMessage && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-green-300 text-sm font-semibold">✓ Invoice marked as paid!</p>
            </div>
          )}
        </CardBody>
      </Card>
    )
  }

  // Wallet Payment Card (legacy)
  if (paymentMethod === 'crypto' && walletAddress) {
    return (
      <Card className="mb-6 border-green-500/30 bg-gradient-to-r from-green-500/5 to-blue-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">💰 Pay with Wallet</h2>
              <p className="text-gray-400 text-sm mt-1">Send to wallet address below</p>
            </div>
            <span className="text-3xl">✓</span>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Payment ready badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/50 rounded-lg w-fit">
            <span className="text-green-400 text-lg">●</span>
            <span className="text-green-300 font-semibold text-sm">Recipient Address</span>
          </div>

          {/* Amount display */}
          <div>
            <p className="text-gray-400 text-sm mb-2">Amount</p>
            <p className="text-3xl font-bold text-blue-400">
              ${invoiceAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
            </p>
          </div>

          {/* Recipient address */}
          <div className="space-y-3">
            <p className="text-gray-400 text-sm font-semibold">Recipient Address:</p>

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
          </div>

          {/* Mark as paid section */}
          <div className="border-t border-gray-700 pt-6">
            <p className="text-gray-400 text-sm mb-4">
              Once payment is sent, mark the invoice as paid:
            </p>

            {markAsPayedError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-red-300 text-sm">{markAsPayedError}</p>
              </div>
            )}

            <button
              onClick={handleMarkAsPaid}
              disabled={isMarkingAsPaid}
              className={`
                w-full px-4 py-2 rounded-lg font-semibold transition
                ${
                  isMarkingAsPaid
                    ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600'
                }
              `}
            >
              {isMarkingAsPaid ? 'Marking as paid...' : '✓ Mark as Paid'}
            </button>
          </div>

          {showSuccessMessage && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-green-300 text-sm font-semibold">✓ Invoice marked as paid!</p>
            </div>
          )}
        </CardBody>
      </Card>
    )
  }

  return null
}

export { PaymentCard as default }
