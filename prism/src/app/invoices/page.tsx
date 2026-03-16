'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'

interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  amount: number
  status: string
  due_date: string
  created_at: string
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showForm, setShowForm] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    due_date: '',
    status: 'draft',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
    fetchClients()
  }, [])

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setInvoices(data)
    setLoading(false)
  }

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name')
    if (data) setClients(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) return

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
          status: formData.status,
        },
      ])
      .select()

    if (data) {
      setInvoices([data[0], ...invoices])
      setFormData({ client_id: '', amount: '', due_date: '', status: 'draft' })
      setShowForm(false)
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from('invoices').delete().eq('id', id)
    setInvoices(invoices.filter(inv => inv.id !== id))
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-500/20 border-green-400/30 text-green-300'
      case 'draft': return 'bg-gray-500/20 border-gray-400/30 text-gray-300'
      case 'overdue': return 'bg-red-500/20 border-red-400/30 text-red-300'
      default: return 'bg-blue-500/20 border-blue-400/30 text-blue-300'
    }
  }

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="flex justify-between items-center mb-10">
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

        {/* Create Form */}
        {showForm && (
          <Card className="mb-8 animate-in fade-in slide-in-from-top-4">
            <CardHeader>
              <h2 className="text-xl font-bold text-white">Create New Invoice</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    required
                    className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 appearance-none"
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id} className="bg-slate-900">
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Amount (USD)"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                  />
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                    className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                  />
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 appearance-none"
                  >
                    <option value="draft" className="bg-slate-900">Draft</option>
                    <option value="sent" className="bg-slate-900">Sent</option>
                    <option value="paid" className="bg-slate-900">Paid</option>
                    <option value="overdue" className="bg-slate-900">Overdue</option>
                  </select>
                </div>
                <Button type="submit" variant="primary" className="w-full md:w-auto">
                  ✓ Create Invoice
                </Button>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Invoices List */}
        <div className="space-y-4">
          {loading ? (
            <div className="glass px-8 py-12 rounded-lg text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
              <p className="text-gray-300">Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-gray-400 text-center py-12 text-lg">
                  {showForm ? 'Create your first invoice above' : 'No invoices yet. Create your first invoice!'}
                </p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice, idx) => (
                <Card 
                  key={invoice.id}
                  className="hover:border-blue-400/50 group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <CardBody className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-white group-hover:text-blue-300 transition-colors">
                        {invoice.invoice_number}
                      </h3>
                      <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mt-1">
                        ${invoice.amount.toFixed(2)}
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(invoice.id)}
                        className="hover:border-red-400/50 hover:text-red-300"
                      >
                        🗑
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
