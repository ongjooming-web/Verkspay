'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { formatCurrency } from '@/lib/countries'

interface RecurringInvoice {
  id: string
  client_id: string
  client_name?: string
  amount: number
  currency_code: string
  frequency: string
  next_generate_date: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  invoices_generated: number
  created_at: string
}

export default function RecurringInvoicesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecurringInvoices = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) {
          router.push('/login')
          return
        }

        setUser(userData.user)
        const userId = userData.user.id

        // Fetch recurring invoices with client names
        const { data: recurringData, error } = await supabase
          .from('recurring_invoices')
          .select(`
            id,
            client_id,
            amount,
            currency_code,
            frequency,
            next_generate_date,
            status,
            invoices_generated,
            created_at,
            clients (name)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('[RecurringInvoices] Error fetching:', error)
        } else if (recurringData) {
          const formatted = recurringData.map((r: any) => ({
            ...r,
            client_name: r.clients?.name || 'Unknown Client'
          }))
          setRecurringInvoices(formatted)
        }
      } catch (err) {
        console.error('[RecurringInvoices] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRecurringInvoices()
  }, [router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 border-green-400/30 text-green-300'
      case 'paused':
        return 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300'
      case 'completed':
        return 'bg-gray-500/20 border-gray-400/30 text-gray-300'
      case 'cancelled':
        return 'bg-red-500/20 border-red-400/30 text-red-300'
      default:
        return 'bg-gray-500/20 text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '✓'
      case 'paused':
        return '⏸'
      case 'completed':
        return '✓'
      case 'cancelled':
        return '✗'
      default:
        return '•'
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    setActionLoading(id)
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active'
      const { error } = await supabase
        .from('recurring_invoices')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('[RecurringInvoices] Toggle error:', error)
      } else {
        // Update local state
        setRecurringInvoices(
          recurringInvoices.map((r) =>
            r.id === id ? { ...r, status: newStatus } : r
          )
        )
      }
    } catch (err) {
      console.error('[RecurringInvoices] Error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this recurring invoice? This cannot be undone.')) {
      return
    }

    setActionLoading(id)
    try {
      const { error } = await supabase
        .from('recurring_invoices')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('[RecurringInvoices] Cancel error:', error)
      } else {
        setRecurringInvoices(
          recurringInvoices.map((r) =>
            r.id === id ? { ...r, status: 'cancelled' } : r
          )
        )
      }
    } catch (err) {
      console.error('[RecurringInvoices] Error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6 flex justify-center items-center h-96">
          <div className="text-gray-400">Loading recurring invoices...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold text-white">🔄 Recurring Invoices</h1>
          <Link href="/invoices/recurring/new">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg">
              + Create Recurring
            </Button>
          </Link>
        </div>

        {/* Empty State */}
        {recurringInvoices.length === 0 ? (
          <Card className="border-blue-500/30">
            <CardBody>
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🔄</div>
                <h2 className="text-xl font-semibold text-white mb-2">No recurring invoices yet</h2>
                <p className="text-gray-400 mb-6">Set up recurring invoices to automatically generate drafts for retainer clients</p>
                <Link href="/invoices/recurring/new">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
                    Create Recurring Invoice
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card className="border-blue-500/30">
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Client</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">Amount</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Frequency</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Next Generation</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Generated</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recurringInvoices.map((recurring) => (
                      <tr
                        key={recurring.id}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="py-3 px-4 text-white">{recurring.client_name}</td>
                        <td className="py-3 px-4 text-right text-white font-semibold">
                          {formatCurrency(recurring.amount, recurring.currency_code)}
                        </td>
                        <td className="py-3 px-4 text-gray-300 capitalize">
                          {recurring.frequency}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-sm">
                          {new Date(recurring.next_generate_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(recurring.status)}`}>
                            {getStatusIcon(recurring.status)} {recurring.status.charAt(0).toUpperCase() + recurring.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-300">{recurring.invoices_generated}</td>
                        <td className="py-3 px-4 text-center space-y-1">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <Link href={`/invoices/recurring/${recurring.id}/edit`}>
                              <button className="text-blue-400 hover:text-blue-300 text-xs font-medium px-2 py-1 rounded hover:bg-blue-500/10 transition">
                                Edit
                              </button>
                            </Link>
                            <button
                              onClick={() => handleToggleStatus(recurring.id, recurring.status)}
                              disabled={actionLoading === recurring.id}
                              className="text-yellow-400 hover:text-yellow-300 text-xs font-medium px-2 py-1 rounded hover:bg-yellow-500/10 transition disabled:opacity-50"
                            >
                              {recurring.status === 'active' ? 'Pause' : 'Resume'}
                            </button>
                            <button
                              onClick={() => handleCancel(recurring.id)}
                              disabled={actionLoading === recurring.id || recurring.status === 'cancelled'}
                              className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-1 rounded hover:bg-red-500/10 transition disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Back Link */}
        <Link href="/invoices" className="mt-6 text-blue-400 hover:text-blue-300 text-sm">
          ← Back to Invoices
        </Link>
      </div>
    </div>
  )
}
