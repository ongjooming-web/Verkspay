'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/countries'

interface LineItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

interface Invoice {
  id: string
  invoice_number: string
  created_at: string
  due_date: string
  amount: number
  status: 'paid' | 'unpaid' | 'paid_partial' | 'overdue'
  currency_code: string
  line_items?: LineItem[]
}

interface Client {
  name: string
  email: string
  company?: string
}

export default function InvoiceDetail() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string
  const token = (params as any).token as string || new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('token')

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        // Get token from URL params or query string
        const urlParams = new URLSearchParams(window.location.search)
        const portalToken = urlParams.get('token') || token

        if (!portalToken) {
          setError('No access token provided')
          return
        }

        // Fetch portal data (includes invoices)
        const response = await fetch('/api/client-portal/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: portalToken }),
        })

        if (!response.ok) {
          throw new Error('Failed to load invoice')
        }

        const data = await response.json()
        setClient(data.client)

        // Find the specific invoice
        const foundInvoice = data.data.invoices.find((inv: Invoice) => inv.id === invoiceId)
        if (!foundInvoice) {
          setError('Invoice not found')
          return
        }

        setInvoice(foundInvoice)
      } catch (err) {
        console.error('[InvoiceDetail] Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load invoice')
      } finally {
        setLoading(false)
      }
    }

    if (invoiceId) {
      fetchInvoice()
    }
  }, [invoiceId, token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'Could not load this invoice'}</p>
          <Link href={`/client-portal/${token || new URLSearchParams(window.location.search).get('token')}`}>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
              ← Back to Invoices
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'unpaid':
        return 'bg-yellow-100 text-yellow-800'
      case 'paid_partial':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const generatePaymentLink = async () => {
    if (!invoice) return

    setGeneratingLink(true)
    try {
      const response = await fetch('/api/invoices/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          amount: invoice.amount,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate payment link')
      }

      const data = await response.json()
      setPaymentLink(data.payment_link)
    } catch (err) {
      console.error('[PaymentLink] Error:', err)
      alert(`Failed to generate payment link: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setGeneratingLink(false)
    }
  }

  const urlToken = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('token') || token

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-blue-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link href={`/client-portal/${urlToken}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 block">
            ← Back to Invoices
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{invoice.invoice_number}</h1>
              <p className="text-gray-600 mt-1">Invoice Details</p>
            </div>
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(invoice.status)}`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Invoice Meta */}
        <div className="bg-white rounded-lg border border-blue-200 p-8 mb-8">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-sm text-gray-600 uppercase mb-2">Invoice To</p>
              <p className="text-lg font-semibold text-gray-900">{client.name}</p>
              {client.company && <p className="text-gray-600">{client.company}</p>}
              <p className="text-gray-600">{client.email}</p>
            </div>
            <div className="text-right">
              <div className="mb-6">
                <p className="text-sm text-gray-600 uppercase mb-1">Invoice Date</p>
                <p className="text-lg font-semibold text-gray-900">{new Date(invoice.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 uppercase mb-1">Due Date</p>
                <p className="text-lg font-semibold text-gray-900">{new Date(invoice.due_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          {invoice.line_items && invoice.line_items.length > 0 && (
            <div className="border-t border-blue-200 pt-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-blue-200">
                    <th className="text-left py-2 font-semibold text-gray-900">Description</th>
                    <th className="text-right py-2 font-semibold text-gray-900">Qty</th>
                    <th className="text-right py-2 font-semibold text-gray-900">Rate</th>
                    <th className="text-right py-2 font-semibold text-gray-900">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item, idx) => (
                    <tr key={idx} className="border-b border-blue-100">
                      <td className="py-3 text-gray-900">{item.description}</td>
                      <td className="text-right py-3 text-gray-600">{item.quantity}</td>
                      <td className="text-right py-3 text-gray-600">{formatCurrency(item.rate, invoice.currency_code)}</td>
                      <td className="text-right py-3 font-semibold text-gray-900">{formatCurrency(item.amount, invoice.currency_code)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total */}
              <div className="flex justify-end mt-6 pt-6 border-t border-blue-200">
                <div className="w-64">
                  <div className="flex justify-between py-2 mb-4">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(invoice.amount, invoice.currency_code)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-blue-50 px-4 rounded-lg">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(invoice.amount, invoice.currency_code)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment Section */}
        <div className="bg-white rounded-lg border border-blue-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
          <p className="text-gray-600 mb-6">
            {invoice.status === 'paid' && 'This invoice has been paid. Thank you!'}
            {invoice.status === 'unpaid' && 'This invoice is awaiting payment.'}
            {invoice.status === 'overdue' && 'This invoice is overdue. Please arrange payment at your earliest convenience.'}
            {invoice.status === 'paid_partial' && 'This invoice has been partially paid. Outstanding balance is still due.'}
          </p>

          {/* Payment Link or Button */}
          {paymentLink ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 mb-3">✓ Payment link generated!</p>
                <div className="bg-white rounded p-3 border border-green-100 mb-3">
                  <p className="text-xs text-gray-500 mb-1">Payment Link:</p>
                  <p className="text-sm font-mono break-all text-gray-700">{paymentLink}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(paymentLink)
                    alert('Payment link copied to clipboard!')
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition"
                >
                  📋 Copy Payment Link
                </button>
              </div>
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-center transition"
              >
                💳 Pay Now
              </a>
            </div>
          ) : (
            invoice.status !== 'paid' && (
              <button
                onClick={generatePaymentLink}
                disabled={generatingLink}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition"
              >
                {generatingLink ? '⏳ Generating Payment Link...' : '💳 Pay Invoice'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
