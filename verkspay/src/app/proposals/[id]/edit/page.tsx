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

export default function EditProposal() {
  const router = useRouter()
  const params = useParams()
  const proposalId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, rate: 0, amount: 0 }
  ])

  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    summary: '',
    scope_of_work: '',
    deliverables: '',
    timeline: '',
    total_amount: 0,
    currency_code: 'MYR',
    valid_until: '',
    payment_terms: 'Net 30',
    terms_and_conditions: ''
  })

  const [proposalStatus, setProposalStatus] = useState<string>('draft')

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        router.push('/login')
        return
      }

      setUser(userData.user)

      // Fetch proposal
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .eq('user_id', userData.user.id)
        .single()

      if (proposalError || !proposalData) {
        console.error('[EditProposal] Not found:', proposalError)
        router.push('/proposals')
        return
      }

      // Prevent editing sent proposals
      if (proposalData.status !== 'draft') {
        setMessage('⚠️ Can only edit draft proposals. Create a new proposal instead.')
        setTimeout(() => router.push(`/proposals/${proposalId}`), 2000)
        return
      }

      setProposalStatus(proposalData.status)

      // Pre-fill form
      setFormData({
        title: proposalData.title || '',
        client_id: proposalData.client_id || '',
        summary: proposalData.summary || '',
        scope_of_work: proposalData.scope_of_work || '',
        deliverables: proposalData.deliverables || '',
        timeline: proposalData.timeline || '',
        total_amount: proposalData.total_amount || 0,
        currency_code: proposalData.currency_code || 'MYR',
        valid_until: proposalData.valid_until || '',
        payment_terms: proposalData.payment_terms || 'Net 30',
        terms_and_conditions: proposalData.terms_and_conditions || ''
      })

      if (proposalData.line_items && Array.isArray(proposalData.line_items)) {
        setLineItems(proposalData.line_items)
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
  }, [router, proposalId])

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
    setFormData({ ...formData, total_amount: total })
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, rate: 0, amount: 0 }])
  }

  const removeLineItem = (idx: number) => {
    const updated = lineItems.filter((_, i) => i !== idx)
    setLineItems(updated)

    // Update total
    const total = updated.reduce((sum, li) => sum + li.amount, 0)
    setFormData({ ...formData, total_amount: total })
  }

  const handleSave = async (asDraft: boolean) => {
    if (!user || !formData.title || !formData.client_id) {
      setMessage('❌ Fill in title and client')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('proposals')
        .update({
          title: formData.title,
          client_id: formData.client_id,
          summary: formData.summary,
          scope_of_work: formData.scope_of_work,
          deliverables: formData.deliverables,
          timeline: formData.timeline,
          total_amount: formData.total_amount,
          currency_code: formData.currency_code,
          line_items: lineItems,
          valid_until: formData.valid_until,
          payment_terms: formData.payment_terms,
          terms_and_conditions: formData.terms_and_conditions,
          status: asDraft ? 'draft' : 'sent',
          sent_at: asDraft ? null : new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', proposalId)
        .eq('user_id', user.id)

      if (error) {
        console.error('[EditProposal] Error:', error)
        setMessage('❌ Failed to update proposal')
        setSaving(false)
        return
      }

      setMessage(`✅ Proposal ${asDraft ? 'saved' : 'sent'}!`)
      setTimeout(() => router.push(`/proposals/${proposalId}`), 1500)
    } catch (err) {
      console.error('[EditProposal] Error:', err)
      setMessage('❌ An error occurred')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-4xl mx-auto p-6 flex justify-center items-center h-96">
          <div className="text-gray-400">Loading proposal...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <h1 className="text-4xl font-bold text-white mb-10">Edit Proposal</h1>

        {message && (
          <Card className={`mb-6 border-${message.includes('✅') ? 'green' : 'red'}-500/30`}>
            <CardBody>
              <p className={message.includes('✅') ? 'text-green-300' : 'text-red-300'}>{message}</p>
            </CardBody>
          </Card>
        )}

        {proposalStatus !== 'draft' && (
          <Card className="mb-6 border-yellow-500/30">
            <CardBody>
              <p className="text-yellow-300">⚠️ Only draft proposals can be edited. This proposal is {proposalStatus}.</p>
            </CardBody>
          </Card>
        )}

        {/* Basic Info */}
        <Card className="mb-6 border-blue-500/30">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">Proposal Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Website Redesign Proposal"
                className="w-full glass px-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Summary</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief overview of the proposal"
                rows={3}
                className="w-full glass px-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Scope of Work</label>
              <textarea
                value={formData.scope_of_work}
                onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
                placeholder="What you'll do"
                rows={4}
                className="w-full glass px-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Deliverables</label>
              <textarea
                value={formData.deliverables}
                onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                placeholder="What the client gets"
                rows={4}
                className="w-full glass px-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Timeline</label>
              <textarea
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                placeholder="When things will be delivered"
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
                Total: {formData.total_amount.toFixed(2)}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Terms */}
        <Card className="mb-6 border-blue-500/30">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">Terms</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Valid Until</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="glass px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Terms & Conditions</label>
              <textarea
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                placeholder="Optional terms and conditions"
                rows={4}
                className="w-full glass px-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            </div>
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => handleSave(true)}
            disabled={saving || proposalStatus !== 'draft'}
            className="bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button
            onClick={() => handleSave(false)}
            disabled={saving || proposalStatus !== 'draft'}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50"
          >
            {saving ? 'Sending...' : 'Send Proposal'}
          </Button>
          <Link href={`/proposals/${proposalId}`}>
            <Button className="bg-gray-600 hover:bg-gray-700 text-white">Cancel</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
