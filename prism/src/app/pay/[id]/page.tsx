'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'

interface PaymentPageData {
  invoice: {
    id: string
    invoice_number: string
    amount: number
    due_date: string
    description?: string
    status: string
    created_at: string
    line_items: any[]
  }
  freelancer: {
    full_name: string
    payment_method: string
    stripe_account_id: string
    stripe_onboarding_complete: boolean
  }
}

export default function PaymentPage() {
  const params = useParams()
  const invoiceId = params.id as string

  const [data, setData] = useState<PaymentPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientEmail, setClientEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [successFromUrl, setSuccessFromUrl] = useState(false)

  useEffect(() => {
    // Check for success query param
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      setSuccessFromUrl(true)
    }
    
    fetchInvoiceData()
  }, [invoiceId])

  // Check if invoice is marked as paid when success page shows
  useEffect(() => {
    if (!successFromUrl || !data || data.invoice.status === 'paid') {
      return
    }

    const markInvoiceAsPaid = async () => {
      console.log('[PaymentPage] Checking if invoice marked as paid (webhook)')
      try {
        // Fetch fresh copy to see if webhook updated it
        const response = await fetch(`/api/invoices/${invoiceId}/public`)
        if (response.ok) {
          const freshData = await response.json()
          if (freshData.invoice.status === 'paid') {
            console.log('[PaymentPage] Invoice confirmed paid via webhook')
            setData(freshData)
          }
        }
      } catch (err) {
        console.error('[PaymentPage] Error checking invoice status:', err)
      }
    }

    // Give webhook 2 seconds to process, then check
    const timer = setTimeout(markInvoiceAsPaid, 2000)
    return () => clearTimeout(timer)
  }, [successFromUrl, invoiceId, data?.invoice.status])

  const fetchInvoiceData = async () => {
    try {
      console.log('[PaymentPage] Fetching invoice:', invoiceId)
      const response = await fetch(`/api/invoices/${invoiceId}/public`)

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load invoice')
        setLoading(false)
        return
      }

      const result = await response.json()
      console.log('[PaymentPage] Invoice loaded:', result)
      console.log('[PaymentPage] Freelancer full_name:', result.freelancer?.full_name)
      setData(result)
    } catch (err: any) {
      console.error('[PaymentPage] Error fetching invoice:', err)
      setError('Failed to load invoice details')
    } finally {
      setLoading(false)
    }
  }

  const handlePayNow = async () => {
    if (!clientEmail || !clientEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      console.log('[PaymentPage] Creating payment link for:', invoiceId)
      
      const response = await fetch('/api/stripe/payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceId,
          amount: data?.invoice.amount,
          clientEmail,
          freelancerId: data?.freelancer
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Special handling for limit exceeded
        if (errorData.code === 'LIMIT_EXCEEDED') {
          setError(`⛔ ${errorData.error}\n\nCurrent usage: ${errorData.count}/${errorData.limit} payment links this month`)
        } else {
          setError(errorData.error || 'Failed to create payment link')
        }
        
        setIsProcessing(false)
        return
      }

      const result = await response.json()
      console.log('[PaymentPage] Payment link created:', result.payment_url)

      // Redirect to Stripe Payment Link
      if (result.payment_url) {
        window.location.href = result.payment_url
      }
    } catch (err: any) {
      console.error('[PaymentPage] Error creating payment link:', err)
      setError(err.message || 'Failed to process payment')
      setIsProcessing(false)
    }
  }

  // Show success state if redirected from Stripe
  if (successFromUrl && data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="mb-8 border-green-500/30 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
            <CardBody className="text-center py-12 space-y-6">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-4xl font-bold text-green-400">Payment Successful!</h1>
              <p className="text-gray-300 text-lg">
                Thank you, your payment of <span className="text-green-400 font-bold">${data.invoice.amount.toFixed(2)}</span> has been received
              </p>
              
              <div className="glass rounded-lg p-4 border-green-400/30 bg-green-500/10 mt-6">
                <p className="text-gray-400 text-sm mb-1">Invoice Number</p>
                <p className="text-white font-mono text-lg">{data.invoice.invoice_number}</p>
                <div className="mt-3 pt-3 border-t border-green-400/20">
                  <p className="text-green-400 text-sm font-semibold">✓ Invoice Marked as Paid</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm pt-4">
                A confirmation email will be sent shortly.
              </p>
            </CardBody>
          </Card>

          <div className="text-center text-gray-400 text-sm">
            <p>Powered by <span className="text-blue-400 font-semibold">Prism</span></p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="glass px-8 py-12 rounded-lg text-center max-w-md w-full">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-gray-300">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="glass px-8 py-12 rounded-lg text-center max-w-md w-full">
          <p className="text-red-300 mb-6">{error || 'Invoice not found'}</p>
          <Link href="/">
            <Button className="w-full">← Back to Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { invoice, freelancer } = data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">💳 Payment</h1>
          <p className="text-gray-400">Complete your payment securely</p>
        </div>

        {/* Invoice Card */}
        <Card className="mb-8 border-blue-500/30">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">{invoice.invoice_number}</h2>
                <p className="text-gray-400">From: <span className="text-blue-300 font-semibold">{freelancer.full_name}</span></p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Amount Due</p>
                <p className="text-3xl font-bold text-green-400">${invoice.amount.toFixed(2)}</p>
              </div>
            </div>
          </CardHeader>

          <CardBody className="space-y-6">
            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Invoice Number</p>
                <p className="text-white font-mono">{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Due Date</p>
                <p className="text-white">{new Date(invoice.due_date).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Line Items */}
            {invoice.line_items && invoice.line_items.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <p className="text-gray-400 text-sm mb-3 font-semibold">Line Items</p>
                <div className="space-y-2">
                  {invoice.line_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-300">{item.description || 'Item'}</span>
                      <span className="text-white font-semibold">${item.amount?.toFixed(2) || '0.00'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {invoice.description && (
              <div className="border-t border-white/10 pt-4">
                <p className="text-gray-400 text-sm mb-2">Description</p>
                <p className="text-gray-300 whitespace-pre-wrap">{invoice.description}</p>
              </div>
            )}

            {/* Payment Method */}
            <div className="border-t border-white/10 pt-4">
              <p className="text-gray-400 text-sm mb-3 font-semibold">Payment Method</p>
              {freelancer.payment_method === 'bank' && freelancer.stripe_onboarding_complete ? (
                <div className="glass rounded-lg p-3 border-green-400/30 bg-green-500/10">
                  <p className="text-green-300 text-sm">💳 Stripe Bank Transfer</p>
                </div>
              ) : freelancer.payment_method === 'crypto' ? (
                <div className="glass rounded-lg p-3 border-purple-400/30 bg-purple-500/10">
                  <p className="text-purple-300 text-sm">💰 USDC Wallet</p>
                </div>
              ) : (
                <div className="glass rounded-lg p-3 border-red-400/30 bg-red-500/10">
                  <p className="text-red-300 text-sm">❌ Payment method not available</p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="glass rounded-lg p-4 border-red-500/30 bg-red-500/10">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Email Input & Pay Button */}
            {freelancer.payment_method === 'bank' && freelancer.stripe_onboarding_complete ? (
              <div className="border-t border-white/10 pt-6 space-y-4">
                {!showEmailInput ? (
                  <Button
                    onClick={() => setShowEmailInput(true)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold hover:from-green-700 hover:to-green-600 transition rounded-lg"
                  >
                    ✓ Pay Now
                  </Button>
                ) : (
                  <>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Email Address</label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full px-4 py-2 glass rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowEmailInput(false)
                          setClientEmail('')
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handlePayNow}
                        disabled={isProcessing}
                        className={`flex-1 py-2 font-semibold rounded-lg transition ${
                          isProcessing
                            ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600'
                        }`}
                      >
                        {isProcessing ? 'Processing...' : '💳 Pay with Stripe'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="glass rounded-lg p-4 border-yellow-400/30 bg-yellow-500/10">
                <p className="text-yellow-300 text-sm">⚠️ Payment is not available for this invoice. Please contact the freelancer.</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm">
          <p>Powered by <span className="text-blue-400 font-semibold">Prism</span></p>
        </div>
      </div>
    </div>
  )
}
