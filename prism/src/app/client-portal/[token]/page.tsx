'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/countries'

interface Invoice {
  id: string
  invoice_number: string
  created_at: string
  due_date: string
  amount: number
  status: 'paid' | 'unpaid' | 'paid_partial' | 'overdue'
  currency: string
}

interface Client {
  name: string
  email: string
  business_name?: string
}

interface PortalData {
  client: Client
  data: {
    invoices: Invoice[]
    summary: {
      total_invoices: number
      total_amount: number
      paid_amount: number
      unpaid_amount: number
      overdue_count: number
    }
  }
}

export default function ClientPortal() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        const response = await fetch('/api/client-portal/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        if (!response.ok) {
          throw new Error('Failed to load portal data')
        }

        const portalData = await response.json()
        setData(portalData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('[ClientPortal] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchPortalData()
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Fetching your invoices...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">{error || 'Invalid or expired link'}</p>
          <p className="text-sm text-gray-500">
            Please contact your business to request a new portal link.
          </p>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-blue-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Invoices</h1>
              <p className="text-gray-600 mt-1">{data.client.business_name || 'Verkspay'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Portal for</p>
              <p className="font-semibold text-gray-900">{data.client.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-gray-600">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900">{data.data.summary.total_invoices}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(data.data.summary.paid_amount, data.data.invoices[0]?.currency || 'USD')}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <p className="text-sm text-gray-600">Unpaid</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(data.data.summary.unpaid_amount, data.data.invoices[0]?.currency || 'USD')}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-yellow-200">
            <p className="text-sm text-gray-600">Overdue</p>
            <p className="text-2xl font-bold text-yellow-600">{data.data.summary.overdue_count}</p>
          </div>
        </div>

        {/* Invoices Table */}
        {data.data.invoices.length > 0 ? (
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-blue-50 border-b border-blue-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Invoice</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Due Date</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {data.data.invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-blue-50 transition">
                    <td className="px-6 py-4 font-semibold text-blue-600">
                      <Link href={`/client-portal/invoice/${invoice.id}?token=${token}`} className="hover:underline">
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-blue-200 p-8 text-center">
            <p className="text-gray-600">No invoices yet</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center text-sm text-gray-600">
          <p>Questions? Contact {data.client.business_name || 'your business'}</p>
        </div>
      </div>
    </div>
  )
}
