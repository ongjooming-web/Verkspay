'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'

interface LineItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

interface Client {
  id: string
  name: string
}

export default function EditRecurringInvoice() {
  const router = useRouter()
  const params = useParams()
  const recurringId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, rate: 0, amount: 0 }
  ])

  const [formData, setFormData] = useState({
    client_id: '',
    frequency: 'monthly',
    start_date: '',
    end_date: '',
    description: '',
    payment_terms: 'Net 30',
    amount: 0,
    currency_code: 'MYR'
  })

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        router.push('/login')
        return
      }

      setUser(userData.user)

      // Fetch recurring invoice
      const { data: recurringData, error: recurringError } = await supabase
        .from('recurring_invoices')
        .select('*')
        .eq('id', recurringId)
        .eq('user_id', userData.user.id)
        .single()

      if (recurringError || !recurringData) {
        console.error('[EditRecurringInvoice] Not found:', recurringError)
        router.push('/invoices/recurring')
        return
      }

      // Pre-fill form
      setFormData({
        client_id: recurringData.client_id || '',
        frequency: recurringData.frequency || 'monthly',
        start_date: recurringData.start_date || '',
        end_date: recurringData.end_date || '',
        description: recurringData.description || '',
        payment_terms: recurringData.payment_terms || 'Net 30',
        amount: recurringData.amount || 0,
        currency_code: recurringData.currency_code || 'MYR'
      })

      if (recurringData.line_items && Array.isArray(recurringData.line_items)) {
        setLineItems(recurringData.line_items)
      }

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', userData.user.id)
        .order('name')

      if (clientsData) {
        setClients(clientsData)
      }

      setLoading(false)
    }

    fetchData()
  }, [router, recurringId])

  const updateLineItem = (idx: number, field: string, value: any) => {
    const updated = [...lineItems]
    const item = updated[idx]

    if (field === 'quantity') {
      item.quantity = parseFloat(value) || 0
      item.amount = item.quantity * item.rate
    } else if (field === 'rate') {
      item.rate = parseFloat(value) || 0
      item.amount = item.quantity * item.rate
    } else if (field === 'description') {
      item.description = value
    }

    updated[idx] = item
    setLineItems(updated)

    // Update total
    const total = updated.reduce((sum, li) => sum + li.amount, 0)
    setFormData({ ...formData, amount: total })
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, rate: 0, amount: 0 }])
  }

  const removeLineItem = (idx: number) => {
    const updated = lineItems.filter((_, i) => i !== idx)
    setLineItems(updated)

    // Update total
    const total = updated.reduce((sum, li) => sum + li.amount, 0)
    setFormData({ ...formData, amount: total })
  }

  const handleSave = async () => {
    if (!user || !formData.client_id || !formData.start_date) {
      setMessage('❌ Fill in client and start date')
      return
    }

    if (formData.amount === 0) {
      setMessage('❌ Add line items with amounts')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('recurring_invoices')
        .update({
          client_id: formData.client_id,
          frequency: formData.frequency,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          description: formData.description,
          payment_terms: formData.payment_terms,
          amount: formData.amount,
          currency_code: formData.currency_code,
          line_items: lineItems,
          updated_at: new Date().toISOString()
        })
        .eq('id', recurringId)
        .eq('user_id', user.id)

      if (error) {
        console.error('[EditRecurringInvoice] Error:', error)
        setMessage('❌ Failed to update recurring invoice')
        setSaving(false)
        return
      }

      setMessage('✅ Recurring invoice updated!')
      setTimeout(() => router.push('/invoices/recurring'), 1500)
    } catch (err) {
      console.error('[EditRecurringInvoice] Error:', err)
      setMessage('❌ An error occurred')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-4xl mx-auto p-6 flex justify-center items-center h-96">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <h1 className="text-4xl font-bold text-white mb-10">Edit Recurring Invoice</h1>

        {message && (
          <Card className={`mb-6 border-${message.includes('✅') ? 'green' : 'red'}-500/30`}>
            <CardBody>
              <p className={message.includes('✅') ? 'text-green-300' : 'text-red-300'}>{message}</p>
            </CardBody>
          </Card>
        )}

        {/* Basic Info */}
        <Card className="mb-6 border-blue-500/30">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">Recurring Invoice Setup</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Client *</label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full glass px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Frequency *</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full glass px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Payment Terms</label>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full glass px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option>Due on Receipt</option>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 60</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Date *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full glass px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Date (optional)</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full glass px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank for indefinite</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description / Notes</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes for this recurring invoice"
                rows={3}
                className="w-full glass px-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            </div>
          </CardBody>
        </Card>

        {/* Line Items */}
        <Card className="mb-6 border-blue-500/30">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">Line Items</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-2 text-gray-400 text-sm">Description</th>
                    <th className="text-right py-2 px-2 text-gray-400 text-sm">Qty</th>
                    <th className="text-right py-2 px-2 text-gray-400 text-sm">Rate</th>
                    <th className="text-right py-2 px-2 text-gray-400 text-sm">Amount</th>
                    <th className="text-center py-2 px-2 text-gray-400 text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-white/5">
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                          placeholder="Item description"
                          className="w-full bg-white/5 border border-white/10 px-2 py-1 rounded text-white text-sm placeholder-gray-500"
                        />
                      </td>
                      <td className="text-right py-2 px-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                          className="w-20 bg-white/5 border border-white/10 px-2 py-1 rounded text-white text-sm text-right"
                        />
                      </td>
                      <td className="text-right py-2 px-2">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateLineItem(idx, 'rate', e.target.value)}
                          className="w-24 bg-white/5 border border-white/10 px-2 py-1 rounded text-white text-sm text-right"
                        />
                      </td>
                      <td className="text-right py-2 px-2 text-white font-semibold">{item.amount.toFixed(2)}</td>
                      <td className="text-center py-2 px-2">
                        {lineItems.length > 1 && (
                          <button
                            onClick={() => removeLineItem(idx)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <button
                onClick={addLineItem}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                + Add Item
              </button>
              <div className="text-lg font-bold text-white">
                Total: {formData.amount.toFixed(2)} {formData.currency_code}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Link href="/invoices/recurring">
            <Button className="bg-gray-600 hover:bg-gray-700 text-white">Cancel</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
