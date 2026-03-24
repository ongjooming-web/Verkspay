'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'
import { useCurrency } from '@/hooks/useCurrency'
import { formatCurrency } from '@/lib/countries'
import { groupByCurrency } from '@/lib/currency-helper'
import { LineItem } from '@/types/invoice'

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
  currency_code?: string
  line_items?: LineItem[] | null
}

type FilterStatus = 'all' | 'unpaid' | 'paid' | 'paid_partial' | 'overdue'
type SortBy = 'date' | 'amount' | 'due_date'

export default function Invoices() {
  const { currencyCode } = useCurrency()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showForm, setShowForm] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, rate: 0, amount: 0 }
  ])
  const [formData, setFormData] = useState({
    client_id: '',
    due_date: '',
    description: '',
    payment_terms: 'Net 30',
    custom_payment_terms: '',
  })
  const [showCustomPaymentTerms, setShowCustomPaymentTerms] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [paidByCurrency, setPaidByCurrency] = useState<Record<string, number>>({})
  const [pendingByCurrency, setPendingByCurrency] = useState<Record<string, number>>({})
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false)
  const [additionalSuggestions, setAdditionalSuggestions] = useState<any[]>([])
  
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
        .select('*, currency_code')
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
        
        // Calculate per-currency breakdowns
        const paidInvoices = invoicesWithClients.filter(inv => inv.status === 'paid')
        const pendingInvoices = invoicesWithClients.filter(inv => inv.status !== 'paid')
        setPaidByCurrency(groupByCurrency(paidInvoices))
        setPendingByCurrency(groupByCurrency(pendingInvoices))
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

  // Fetch suggestions and auto-populate form
  const handleClientChange = async (clientId: string) => {
    setFormData({ ...formData, client_id: clientId })
    
    if (!clientId) return

    setSuggestionsLoading(true)
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.warn('[InvoicesList] No auth session available for suggestions')
        setSuggestionsLoading(false)
        return
      }

      const response = await fetch(`/api/invoices/suggestions?clientId=${clientId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const suggestions = await response.json()

      // If no history (invoice_count === 0), don't auto-populate
      if (suggestions.invoice_count === 0) {
        setSuggestionsLoading(false)
        return
      }

      // Auto-populate payment_terms (if field is still empty)
      if (!formData.payment_terms || formData.payment_terms === 'Net 30') {
        if (suggestions.payment_terms) {
          setFormData(prev => ({ ...prev, payment_terms: suggestions.payment_terms }))
        }
      }

      // Auto-populate line items with top 3 suggestions
      if (suggestions.suggested_line_items && suggestions.suggested_line_items.length > 0) {
        const topThree = suggestions.suggested_line_items.slice(0, 3)
        const newLineItems = topThree.map((item: any) => ({
          description: item.description,
          quantity: item.quantity || 1,
          rate: item.rate,
          amount: (item.quantity || 1) * item.rate
        }))
        setLineItems(newLineItems)
        
        // Store additional suggestions for "Suggested from history" panel
        if (suggestions.suggested_line_items.length > 3) {
          setAdditionalSuggestions(suggestions.suggested_line_items.slice(3))
          setShowSuggestionsPanel(true)
        }
      }

      // Show "✨ Auto-filled from history" indicator (fade after 3 seconds)
      const indicator = document.getElementById('auto-fill-indicator')
      if (indicator) {
        indicator.style.display = 'block'
        setTimeout(() => {
          indicator.style.opacity = '0'
          setTimeout(() => (indicator.style.display = 'none'), 300)
        }, 3000)
      }
    } catch (error) {
      console.error('[InvoicesList] Error fetching suggestions:', error)
      // Silently fail - suggestions are optional
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name')
    if (data) setClients(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.client_id || !formData.due_date || lineItems.length === 0 || lineItems.every(item => !item.description || item.amount === 0)) {
      alert('Please fill in all required fields: Client, Due Date, and at least one line item')
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
    const paymentTerms = formData.payment_terms === 'Custom' 
      ? formData.custom_payment_terms 
      : formData.payment_terms

    // Calculate total from line items
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0)

    const { data, error } = await supabase
      .from('invoices')
      .insert([
        {
          user_id: userId,
          invoice_number: invoiceNumber,
          client_id: formData.client_id,
          amount: totalAmount,
          due_date: formData.due_date,
          status: 'unpaid',
          description: formData.description,
          currency_code: currencyCode,
          payment_terms: paymentTerms,
          line_items: lineItems,
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
      setFormData({ client_id: '', due_date: '', description: '', payment_terms: 'Net 30', custom_payment_terms: '' })
      setLineItems([{ description: '', quantity: 1, rate: 0, amount: 0 }])
      setShowCustomPaymentTerms(false)
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
    let matchesStatus = false
    const isOverdue = inv.status !== 'paid' && new Date(inv.due_date) < new Date()
    
    if (filterStatus === 'all') {
      matchesStatus = true
    } else if (filterStatus === 'overdue') {
      matchesStatus = isOverdue
    } else {
      matchesStatus = inv.status === filterStatus
    }
    
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

  const overdueCount = invoices.filter(inv => 
    inv.status !== 'paid' && new Date(inv.due_date) < new Date()
  ).length

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
              <div className="space-y-2">
                {Object.entries(paidByCurrency).length > 0 ? (
                  Object.entries(paidByCurrency).map(([code, total]) => (
                    <p key={code} className="text-2xl font-bold text-green-400">{formatCurrency(total, code)}</p>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No paid invoices</p>
                )}
              </div>
            </CardBody>
          </Card>
          <Card className="hover:scale-105 hover:border-blue-400/50">
            <CardBody>
              <p className="text-gray-400 text-sm mb-2">Pending Amount</p>
              <div className="space-y-2">
                {Object.entries(pendingByCurrency).length > 0 ? (
                  Object.entries(pendingByCurrency).map(([code, total]) => (
                    <p key={code} className="text-2xl font-bold text-blue-400">{formatCurrency(total, code)}</p>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No pending invoices</p>
                )}
              </div>
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
                      onChange={(e) => handleClientChange(e.target.value)}
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
                    <label className="text-gray-400 text-sm mb-2 block">Due Date *</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                      className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Payment Terms</label>
                    <select
                      value={formData.payment_terms}
                      onChange={(e) => {
                        setFormData({ ...formData, payment_terms: e.target.value })
                        setShowCustomPaymentTerms(e.target.value === 'Custom')
                      }}
                      className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 appearance-none"
                    >
                      <option value="Due on Receipt" className="bg-slate-900">Due on Receipt</option>
                      <option value="Net 15" className="bg-slate-900">Net 15</option>
                      <option value="Net 30" className="bg-slate-900">Net 30</option>
                      <option value="Net 60" className="bg-slate-900">Net 60</option>
                      <option value="Net 90" className="bg-slate-900">Net 90</option>
                      <option value="Custom" className="bg-slate-900">Custom</option>
                    </select>
                  </div>
                </div>
                {showCustomPaymentTerms && (
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Custom Payment Terms</label>
                    <input
                      type="text"
                      placeholder="e.g., Net 45 or 50% upfront, 50% on completion"
                      value={formData.custom_payment_terms}
                      onChange={(e) => setFormData({ ...formData, custom_payment_terms: e.target.value })}
                      className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                )}
                {/* Line Items Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-gray-400 text-sm">Line Items *</label>
                    <button
                      type="button"
                      onClick={() => setLineItems([...lineItems, { description: '', quantity: 1, rate: 0, amount: 0 }])}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      + Add Line Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {lineItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                        <input
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...lineItems]
                            newItems[idx].description = e.target.value
                            setLineItems(newItems)
                          }}
                          className="col-span-5 glass px-3 py-2 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...lineItems]
                            const qty = parseFloat(e.target.value) || 0
                            newItems[idx].quantity = qty
                            newItems[idx].amount = qty * (newItems[idx].rate || 0)
                            setLineItems(newItems)
                          }}
                          min="0"
                          step="1"
                          className="col-span-2 glass px-3 py-2 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <input
                          type="number"
                          placeholder="Rate"
                          value={item.rate}
                          onChange={(e) => {
                            const newItems = [...lineItems]
                            const rate = parseFloat(e.target.value) || 0
                            newItems[idx].rate = rate
                            newItems[idx].amount = (newItems[idx].quantity || 0) * rate
                            setLineItems(newItems)
                          }}
                          min="0"
                          step="0.01"
                          className="col-span-2 glass px-3 py-2 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <input
                          type="number"
                          placeholder="Amount"
                          value={item.amount}
                          readOnly
                          className="col-span-2 glass px-3 py-2 rounded-lg text-gray-400 text-sm bg-slate-800 opacity-70"
                        />
                        <button
                          type="button"
                          onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                          className="col-span-1 text-red-400 hover:text-red-300 text-lg font-bold"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-700">
                    <div className="text-right">
                      <span className="text-gray-400 text-sm">Total: </span>
                      <span className="text-white font-bold text-lg">
                        {formatCurrency(lineItems.reduce((sum, item) => sum + (item.amount || 0), 0), currencyCode)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Auto-fill Indicator */}
                <div
                  id="auto-fill-indicator"
                  style={{
                    display: 'none',
                    opacity: '1',
                    transition: 'opacity 0.3s ease',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    textAlign: 'center'
                  }}
                >
                  ✨ Auto-filled from history
                </div>

                {/* Suggested from History Panel */}
                {showSuggestionsPanel && additionalSuggestions.length > 0 && (
                  <div className="border border-blue-400/30 bg-blue-500/10 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-gray-400 text-sm font-semibold">💡 Suggested from History</label>
                      <button
                        type="button"
                        onClick={() => setShowSuggestionsPanel(false)}
                        className="text-gray-400 hover:text-gray-200 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="space-y-2">
                      {additionalSuggestions.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded">
                          <div>
                            <p className="text-white text-sm">{item.description}</p>
                            <p className="text-gray-400 text-xs">Rate: {formatCurrency(item.rate, currencyCode)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLineItems([...lineItems, {
                                description: item.description,
                                quantity: item.quantity || 1,
                                rate: item.rate,
                                amount: (item.quantity || 1) * item.rate
                              }])
                            }}
                            className="text-blue-400 hover:text-blue-300 text-sm font-semibold whitespace-nowrap ml-2"
                          >
                            + Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Invoice Notes (Optional)</label>
                  <textarea
                    placeholder="Additional notes..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <Button type="submit" variant="primary" disabled={suggestionsLoading}>
                  {suggestionsLoading ? '⏳ Loading...' : '✓ Create Invoice'}
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
                          {formatCurrency(invoice.amount, invoice.currency_code || currencyCode || 'MYR')}
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 w-full md:w-auto flex-wrap md:flex-nowrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(invoice.status)}`}>
                            {invoice.status === 'sent' ? '📨 Sent' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                          {invoice.status !== 'paid' && invoice.status !== 'sent' && (
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
