'use client'

import { useState } from 'react'
import { Button } from './Button'
import { Card, CardBody, CardHeader } from './Card'
import { supabase } from '@/lib/supabase'

interface PartialPaymentModalProps {
  invoiceId: string
  invoiceNumber: string
  remainingBalance: number
  onClose: () => void
  onSuccess: () => void
  type: 'manual' | 'stripe'
  currencyCode?: string
}

export function PartialPaymentModal({
  invoiceId,
  invoiceNumber,
  remainingBalance,
  onClose,
  onSuccess,
  type,
  currencyCode
}: PartialPaymentModalProps) {
  const [amount, setAmount] = useState(remainingBalance.toFixed(2))
  const [paymentMethod, setPaymentMethod] = useState('stripe')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentLink, setPaymentLink] = useState<string | null>(null)

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount)

    if (!parsedAmount || parsedAmount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    if (parsedAmount > remainingBalance) {
      setError(`Amount cannot exceed remaining balance: $${remainingBalance.toFixed(2)}`)
      return
    }

    setLoading(true)
    setError('')

    try {
      if (type === 'manual') {
        await handleManualPayment(parsedAmount)
      } else {
        await handleStripePayment(parsedAmount)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleManualPayment = async (paymentAmount: number) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      if (!token) {
        setError('Session expired. Please refresh.')
        return
      }

      const response = await fetch(`/api/invoices/${invoiceId}/record-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentMethod,
          paymentDate,
          notes: notes || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to record payment')
        return
      }

      alert('✅ Payment recorded successfully!')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('[PartialPaymentModal] Manual payment error:', err)
      setError(err.message || 'Failed to process payment')
    }
  }

  const handleStripePayment = async (paymentAmount: number) => {
    if (!clientEmail || !clientEmail.includes('@')) {
      setError('Please enter a valid client email')
      return
    }

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/partial-payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: paymentAmount,
          clientEmail,
          currency_code: currencyCode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create payment link')
        return
      }

      // Show shareable link instead of redirecting
      setPaymentLink(data.payment_url)
    } catch (err: any) {
      console.error('[PartialPaymentModal] Stripe payment error:', err)
      setError(err.message || 'Failed to create payment link')
    }
  }

  if (paymentLink) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <Card className="relative max-w-md w-full">
          <CardHeader>
            <h3 className="text-2xl font-bold text-white">✅ Link Created!</h3>
            <p className="text-gray-400 text-sm mt-2">Share this link with your client</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="glass rounded-lg p-4 border-green-400/30 bg-green-500/10">
              <p className="text-gray-400 text-xs mb-2">PAYMENT LINK</p>
              <p className="text-white text-sm font-mono break-all">{paymentLink}</p>
            </div>
            <div className="glass rounded-lg p-4 border-blue-400/30">
              <p className="text-gray-400 text-xs mb-2">AMOUNT</p>
              <p className="text-2xl font-bold text-blue-300">${amount}</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(paymentLink)
                  alert('Link copied to clipboard!')
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                📋 Copy Link
              </Button>
              <Button
                onClick={() => window.open(paymentLink, '_blank')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                🔗 Open Link
              </Button>
            </div>
            <Button
              onClick={() => {
                setPaymentLink(null)
                onClose()
              }}
              variant="outline"
              className="w-full"
            >
              Done
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <Card className="relative max-w-md w-full">
        <CardHeader>
          <h3 className="text-2xl font-bold text-white">
            {type === 'manual' ? '💰 Record Manual Payment' : '💳 Create Partial Payment Link'}
          </h3>
          <p className="text-gray-400 text-sm mt-2">
            Invoice {invoiceNumber} • Remaining: ${remainingBalance.toFixed(2)}
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Amount */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Payment Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                max={remainingBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="glass w-full pl-7 pr-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                placeholder="0.00"
                disabled={loading}
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">Max: ${remainingBalance.toFixed(2)}</p>
          </div>

          {/* Payment Method (Manual only) */}
          {type === 'manual' && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={loading}
                className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 appearance-none"
              >
                <option value="stripe" className="bg-slate-900">Stripe</option>
                <option value="bank" className="bg-slate-900">Bank Transfer</option>
                <option value="cash" className="bg-slate-900">Cash</option>
                <option value="check" className="bg-slate-900">Check</option>
                <option value="crypto" className="bg-slate-900">Crypto/USDC</option>
              </select>
            </div>
          )}

          {/* Payment Date (Manual only) */}
          {type === 'manual' && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Payment Date *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={loading}
                className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          )}

          {/* Notes (Manual only) */}
          {type === 'manual' && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment reference, check number, etc."
                rows={3}
                disabled={loading}
                className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          )}

          {/* Client Email (Stripe only) */}
          {type === 'stripe' && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Client Email *</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                disabled={loading}
                className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="glass border-red-400/30 bg-red-500/10 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
            >
              {loading ? '⏳ Processing...' : type === 'manual' ? '💾 Save Payment' : '💳 Create Link'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
