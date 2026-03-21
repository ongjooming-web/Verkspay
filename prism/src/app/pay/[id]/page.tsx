'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'
import { formatCurrency } from '@/lib/countries'

interface PaymentPageData {
  invoice: {
    id: string
    invoice_number: string
    amount: number
    remaining_balance: number
    amount_paid: number
    due_date: string
    description?: string
    status: string
    created_at: string
    line_items: any[]
    currency_code: string
  }
  freelancer: {
    full_name: string
    payment_method: string
    stripe_account_id: string
    stripe_onboarding_complete: boolean
  }
  paymentDetails?: {
    bank_name: string
    bank_account_number: string
    bank_account_name: string
    duitnow_id?: string
    payment_instructions?: string
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
        // First, fetch fresh copy to see if webhook updated it
        const response = await fetch(`/api/invoices/${invoiceId}/public`)
        if (response.ok) {
          const freshData = await response.json()
          if (freshData.invoice.status === 'paid') {
            console.log('[PaymentPage] Invoice confirmed paid via webhook')
            setData(freshData)
            return
          }
        }

        // If webhook didn't update it, fallback to manual mark-paid endpoint
        console.log('[PaymentPage] Webhook not received, marking paid via fallback endpoint')
        const markPaidRes = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: data.invoice.amount,
            payment_method: 'stripe'
          })
        })

        if (markPaidRes.ok) {
          const result = await markPaidRes.json()
          console.log('[PaymentPage] Successfully marked invoice as paid', result)
          // Refetch invoice data
          const updatedResponse = await fetch(`/api/invoices/${invoiceId}/public`)
          if (updatedResponse.ok) {
            setData(await updatedResponse.json())
          }
        }
      } catch (err) {
        console.error('[PaymentPage] Error checking invoice status:', err)
      }
    }

    // Give webhook 3 seconds to process, then fallback
    const timer = setTimeout(markInvoiceAsPaid, 3000)
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
      console.log('[PaymentPage] Payment details:', result.paymentDetails)
      setData(result)
    } catch (err: any) {
      console.error('[PaymentPage] Error fetching invoice:', err)
      setError('Failed to load invoice details')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadInvoice = async () => {
    try {
      console.log('[PaymentPage] Downloading invoice PDF:', invoiceId)
      
      // No auth needed for public payment page - invoice is public
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`)

      if (!response.ok) {
        setError('Failed to download invoice')
        return
      }

      const htmlContent = await response.text()
      
      // Open in new window for printing
      const printWindow = window.open('', '', 'height=600,width=800')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        printWindow.print()
        console.log('[PaymentPage] Invoice PDF opened for printing')
      }
    } catch (error) {
      console.error('[PaymentPage] Error downloading invoice:', error)
      setError('Failed to download invoice')
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
          amount: data?.invoice.remaining_balance || data?.invoice.amount,
          clientEmail,
          currency_code: data?.invoice.currency_code
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
      console.log('[PaymentPage] Payment link created:', result.url)

      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url
      } else {
        setError('Payment checkout URL not received')
        setIsProcessing(false)
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
                Thank you, your payment of <span className="text-green-400 font-bold">{formatCurrency(data.invoice.remaining_balance || data.invoice.amount, data.invoice.currency_code || 'MYR')}</span> has been received
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

  const { invoice, freelancer, paymentDetails } = data
  const amountDue = invoice.remaining_balance || invoice.amount

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
                <h2 className="text-3xl font-bold text-white mb-1">INV-{String(invoice.invoice_number).slice(-4).padStart(4, '0')}</h2>
                <p className="text-gray-400">From: <span className="text-blue-300 font-semibold">{freelancer.full_name || 'Freelancer'}</span></p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Amount Due</p>
                <p className="text-3xl font-bold text-green-400">{formatCurrency(amountDue, invoice.currency_code || 'MYR')}</p>
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
                      <span className="text-white font-semibold">{formatCurrency(item.amount || 0, invoice.currency_code)}</span>
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

            {/* Payment Details from Profile - NEW SECTION */}
            {paymentDetails?.bank_account_number && (
              <div className="border-t border-white/10 pt-4">
                <p className="text-gray-400 text-sm mb-3 font-semibold">Payment Methods</p>
                <div className="space-y-3">
                  {/* Bank Transfer */}
                  <div className="glass rounded-lg p-3 border-blue-400/30 bg-blue-500/10">
                    <p className="text-blue-300 text-sm font-semibold mb-2">🏦 Bank Transfer</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-300"><span className="text-gray-400">Bank:</span> {paymentDetails.bank_name}</p>
                      <p className="text-gray-300"><span className="text-gray-400">Account:</span> {paymentDetails.bank_account_number}</p>
                      <p className="text-gray-300"><span className="text-gray-400">Name:</span> {paymentDetails.bank_account_name}</p>
                      <p className="text-gray-400 text-xs mt-2">Reference: {invoice.invoice_number}</p>
                    </div>
                  </div>

                  {/* DuitNow */}
                  {paymentDetails.duitnow_id && (
                    <div className="glass rounded-lg p-3 border-purple-400/30 bg-purple-500/10">
                      <p className="text-purple-300 text-sm font-semibold mb-2">⚡ DuitNow (Real-time)</p>
                      <p className="text-gray-300 text-sm">{paymentDetails.duitnow_id}</p>
                    </div>
                  )}

                  {/* Custom Instructions */}
                  {paymentDetails.payment_instructions && (
                    <div className="glass rounded-lg p-3 border-amber-400/30 bg-amber-500/10">
                      <p className="text-amber-300 text-sm font-semibold mb-2">📝 Payment Instructions</p>
                      <p className="text-gray-300 text-sm">{paymentDetails.payment_instructions}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="glass rounded-lg p-4 border-red-500/30 bg-red-500/10">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Download Invoice & Pay Button */}
            <div className="border-t border-white/10 pt-6 space-y-4">
              {/* Download Invoice Button */}
              <Button
                onClick={handleDownloadInvoice}
                className="w-full px-4 py-3 bg-indigo-600/80 hover:bg-indigo-700/80 text-white font-semibold transition rounded-lg"
              >
                📥 Download Invoice
              </Button>

            {/* Email Input & Pay Button */}
            {freelancer.payment_method === 'bank' && freelancer.stripe_onboarding_complete ? (
              <div className="space-y-4">
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
                <p className="text-yellow-300 text-sm">⚠️ Payment is not available for this invoice. Please contact the sender.</p>
              </div>
            )}
            </div>
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
