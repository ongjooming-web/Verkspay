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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Create Invoice'}
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="bg-white mb-8">
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    required
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Amount"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <Button type="submit">Create Invoice</Button>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Invoices List */}
        <div className="space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : invoices.length === 0 ? (
            <Card className="bg-white">
              <CardBody>
                <p className="text-gray-600 text-center py-8">No invoices yet. Create your first invoice!</p>
              </CardBody>
            </Card>
          ) : (
            invoices.map(invoice => (
              <Card key={invoice.id} className="bg-white">
                <CardBody className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{invoice.invoice_number}</h3>
                    <p className="text-gray-600 text-sm">${invoice.amount.toFixed(2)}</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(invoice.id)}
                  >
                    Delete
                  </Button>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
