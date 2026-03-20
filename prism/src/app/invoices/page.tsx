'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'

interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  client_name?: string
  amount: number
  status: string
  due_date: string
  created_at: string
  payment_method?: string
}

type FilterStatus = 'all' | 'unpaid' | 'paid' | 'paid_partial' | 'overdue'
type SortBy = 'date' | 'amount' | 'due_date'

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showForm, setShowForm] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    due_date: '',
    description: '',
  })
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  
  // Auto-update overdue status based on due_date
  const updateOverdueStatus = async () => {
    const now = new Date()
    for (const invoice of invoices) {
      if (invoice.status !== 'paid' && new Date(invoice.due_date) < now && invoice.status !== 'overdue') {
        await supabase
          .from('invoices')
          .update({ status: 'overdue' })
          .eq('id', invoice.id)
      }
    }
  }
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    fetchInvoices()
    fetchClients()
  }, [refreshTrigger])

  const fetchInvoices = async () => {
    console.log('[InvoicesList] Fetching invoices...')
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (data) {
        console.log('[InvoicesList] Fetched invoices:', data.length)
        const invoicesWithClients = await Promise.all(
          data.map(async (invoice) => {
            const { data: client } = await supabase
              .from('clients')
              .select('name')
              .eq('id', invoice.client_id)
              .single()
            
            return {
              ...invoice,
              client_name: client?.name || 'Unknown Client'
            }
          })
        )
        console.log('[InvoicesList] Updated invoice list with client names')
        setInvoices(invoicesWithClients)
      }
    } catch (err: any) {
      console.error('[InvoicesList] Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  // Public refresh function accessible from detail page
  const refreshInvoices = () => {
    console.log('[InvoicesList] Refresh triggered')
    setRefreshTrigger(prev => prev + 1)
  }

  // Make refresh available globally for cross-component updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__refreshInvoices = refreshInvoices
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__refreshInvoices
      }
    }
  }, [refreshTrigger])

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name')
    if (data) setClients(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.client_id || !formData.amount || !formData.due_date) {
      alert('Please fill in all required fields: Client, Amount, Due Date')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) return

    // Fetch user's current currency setting
    const { data: profileData } = await supabase
      .from('profiles')
      .select('currency_code')
      .eq('id', userId)
      .single()

    const currencyCode = profileData?.currency_code || 'MYR'

    // Subscription limits removed - all features unlocked for all users

    const invoiceNumber = `INV-${Date.now()}`
    const { data, error } = await supabase
      .from('invoices')
      .insert([
        {
          user_id: userId,
          invoice_number: invoiceNumber,
          client_id: formData.client_id,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date,
          status: 'unpaid',
          description: formData.description,
          currency_code: currencyCode,
        },
      ])
      .select()

    if (error) {
      console.error('[InvoicesList] Error creating invoice:', error)
      alert(`Error creating invoice: ${error.message}`)
      return
    }

    if (data && data.length > 0) {
      console.log('[InvoicesList] Invoice created successfully:', data[0])
      setInvoices([{ ...data[0], client_name: clients.find(c => c.id === formData.client_id)?.name || 'Unknown' }, ...invoices])
      setFormData({ client_id: '', amount: '', due_date: '', description: '' })
      setShowForm(false)
      alert('✅ Invoice created successfully!')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice? This action cannot be undone.')) return
    
    await supabase.from('invoices').delete().eq('id', id)
    setInvoices(invoices.filter(inv => inv.id !== id))
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-500/20 border-green-400/30 text-green-300'
      case 'paid_partial': return 'bg-amber-500/20 border-amber-400/30 text-amber-300'
      case 'unpaid': return 'bg-blue-500/20 border-blue-400/30 text-blue-300'
      case 'overdue': return 'bg-red-500/20 border-red-400/30 text-red-300'
      default: return 'bg-gray-500/20 border-gray-400/30 text-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'paid': return 'Paid'
      case 'paid_partial': return 'Partially Paid'
      case 'unpaid': return 'Unpaid'
      case 'overdue': return 'Overdue'
      default: return status
    }
  }

  // Filter invoices
  let filtered = invoices.filter(inv => {
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus
    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    return matchesStatus && matchesSearch
  })

  // Sort invoices
  filtered.sort((a, b) => {
    switch(sortBy) {
      case 'amount':
        return b.amount - a.amount
      case 'due_date':
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      case 'date':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  // Calculate stats
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0)
  
  const pendingAmount = invoices
    .filter(inv => inv.status === 'unpaid' || inv.status === 'paid_partial' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.amount, 0)

  const overdueCount = invoices.filter(inv => inv.status === 'overdue').length

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-10 flex-col md:flex-row gap-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent">
            📄 Invoices
          </h1>
          <Button 
            onClick={() => setShowForm(!showForm)}
            className={showForm ? 'bg-red-600/80 hover:bg-red-700/80' : ''}
          >
            {showForm ? '✕ Cancel' : '+ Create Invoice'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="hover:scale-105 hover:border-green-400/50">
            <CardBody>
              <p className="text-gray-400 text-sm mb-2">Paid Revenue</p>
              <p className="text-3xl font-bold text-green-400">${totalRevenue.toFixed(2)}</p>
            </CardBody>
          </Card>
          <Card className="hover:scale-105 hover:border-blue-400/50">
            <CardBody>
              <p className="text-gray-400 text-sm mb-2">Pending Amount</p>
              <p className="text-3xl font-bold text-blue-400">${pendingAmount.toFixed(2)}</p>
            </CardBody>
          </Card>
          <Card className="hover:scale-105 hover:border-red-400/50">
            <CardBody>
              <p className="text-gray-400 text-sm mb-2">Overdue Invoices</p>
              <p className="text-3xl font-bold text-red-400">{overdueCount}</p>
            </CardBody>
          </Card>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="mb-8 animate-in fade-in slide-in-from-top-4">
            <CardHeader>
              <h2 className="text-xl font-bold text-white">Create New Invoice</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Client *</label>
                    <select
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      required
                      className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 appearance-none"
                    >
                      <option value="">Select Client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id} className="bg-slate-900">
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Amount (USD) *</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Due Date *</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                      className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Description</label>
                  <textarea
                    placeholder="Invoice details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <Button type="submit" variant="primary">
                  ✓ Create Invoice
                </Button>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Search</label>
                <input
                  type="text"
                  placeholder="Search by invoice # or client name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 appearance-none"
                >
                  <option value="date" className="bg-slate-900">Latest First</option>
                  <option value="amount" className="bg-slate-900">Amount (High to Low)</option>
                  <option value="due_date" className="bg-slate-900">Due Date</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'unpaid', 'paid_partial', 'paid', 'overdue'] as FilterStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterStatus === status
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'glass text-gray-300 hover:text-white'
                  }`}
                >
                  {status === 'all' ? 'All' : status === 'paid_partial' ? 'Partially Paid' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Invoices List */}
        <div className="space-y-4">
          {loading ? (
            <div className="glass px-8 py-12 rounded-lg text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
              <p className="text-gray-300">Loading invoices...</p>
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-gray-400 text-center py-12 text-lg">
                  {showForm ? 'Create your first invoice above' : 'No invoices found'}
                </p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map((invoice, idx) => (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                  <Card 
                    className="hover:border-blue-400/50 group cursor-pointer hover:scale-[1.01]"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <CardBody className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-white group-hover:text-blue-300 transition-colors">
                            {invoice.invoice_number}
                          </h3>
                          <span className="text-gray-400 text-sm">• {invoice.client_name}</span>
                        </div>
                        <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mt-1">
                          ${invoice.amount.toFixed(2)}
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 w-full md:w-auto flex-wrap md:flex-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(invoice.status)}`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                          {invoice.status !== 'paid' && (
                            <span className="px-3 py-2 rounded-full text-sm font-medium border border-green-400/50 bg-green-500/10 text-green-300">
                              💳 Ready to Pay
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDelete(invoice.id)
                          }}
                          className="hover:border-red-400/50 hover:text-red-300"
                        >
                          🗑
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
