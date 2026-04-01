'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { generateProposalNumber } from '@/utils/proposal-numbering'

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

export default function NewProposal() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [limitInfo, setLimitInfo] = useState<any>(null)
  const [canCreate, setCanCreate] = useState(true)
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

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        router.push('/login')
        return
      }

      setUser(userData.user)

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', userData.user.id)
        .order('name')

      if (clientsData) {
        setClients(clientsData)
      }

      // Check proposal limit
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session?.access_token) {
          const response = await fetch('/api/proposals/check-limit', {
            headers: {
              'Authorization': `Bearer ${sessionData.session.access_token}`
            }
          })

          const data = await response.json()
          console.log('[NewProposal] Limit check response:', data)
          
          setLimitInfo(data)
          setCanCreate(data.canCreate)

          if (!data.canCreate) {
            setMessage(`⚠️ ${data.message}`)
          }
        }
      } catch (err) {
        console.error('[NewProposal] Error checking limit:', err)
      }
    }

    fetchData()
  }, [router])

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

    // Check limit before creating
    if (!canCreate) {
      setMessage(`❌ You've reached your proposal limit for this month. Upgrade to Pro to create more.`)
      return
    }

    setSaving(true)
    setMessage('')

    try {
      let proposalNumber: string
      try {
        proposalNumber = await generateProposalNumber(user.id, supabase)
      } catch (err) {
        setMessage('❌ Failed to generate proposal number')
        setSaving(false)
        return
      }

      console.log('[NewProposal] Attempting to insert proposal:', {
        user_id: user.id,
        proposal_number: proposalNumber,
        title: formData.title,
        client_id: formData.client_id,
        total_amount: formData.total_amount,
        lineItems: lineItems.length
      })

      const { error, data: insertedData } = await supabase
        .from('proposals')
        .insert([
          {
            user_id: user.id,
            proposal_number: proposalNumber,
            title: formData.title,
            client_id: formData.client_id,
            summary: formData.summary || '',
            scope_of_work: formData.scope_of_work || '',
            deliverables: formData.deliverables || '',
            timeline: formData.timeline || '',
            total_amount: parseFloat(String(formData.total_amount)) || 0,
            currency_code: formData.currency_code || 'MYR',
            line_items: lineItems,
            valid_until: formData.valid_until || null,
            payment_terms: formData.payment_terms || 'Net 30',
            terms_and_conditions: formData.terms_and_conditions || '',
            status: asDraft ? 'draft' : 'sent',
            sent_at: asDraft ? null : new Date().toISOString()
          }
        ])
        .select()

      if (error) {
        console.error('[NewProposal] Supabase error:', error)
        console.error('[NewProposal] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        setMessage(`❌ Failed to create proposal: ${error.message}`)
        setSaving(false)
        return
      }

      console.log('[NewProposal] Proposal created successfully:', insertedData)

      setMessage(`✅ Proposal ${asDraft ? 'saved as draft' : 'sent'}!`)
      setTimeout(() => router.push('/proposals'), 1500)
    } catch (err) {
      console.error('[NewProposal] Error:', err)
      setMessage('❌ An error occurred')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <h1 className="text-4xl font-bold text-white mb-10">Create Proposal</h1>

        {limitInfo && !canCreate && (
          <Card className="mb-6 border-yellow-500/30">
            <CardBody>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-yellow-300 font-semibold mb-2">⚠️ Proposal Limit Reached</p>
                  <p className="text-gray-300 text-sm">{limitInfo.message}</p>
                  <p className="text-gray-400 text-xs mt-2">
                    Your {limitInfo.plan} plan allows {limitInfo.limit} proposals per month.
                  </p>
                </div>
                <Link href="/pricing" className="text-blue-400 hover:text-blue-300 text-sm font-medium whitespace-nowrap">
                  Upgrade →
                </Link>
              </div>
            </CardBody>
          </Card>
        )}

        {limitInfo && canCreate && (
          <Card className="mb-6 border-green-500/30 bg-green-500/5">
            <CardBody>
              <p className="text-green-300 text-sm">
                ✓ {limitInfo.plan === 'master' 
                  ? 'Master account - Unlimited proposals' 
                  : limitInfo.limit === Infinity 
                  ? 'Unlimited proposals this month' 
                  : `${limitInfo.limit - limitInfo.count} proposals remaining this month`}
              </p>
            </CardBody>
          </Card>
        )}

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
                className="w-full glass px-4 py-2 rounded-lg text-white bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="" className="bg-gray-900 text-white">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id} className="bg-gray-900 text-white">
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
                className="w-full glass px-4 py-2 rounded-lg text-white bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option className="bg-gray-900 text-white">Due on Receipt</option>
                <option className="bg-gray-900 text-white">Net 15</option>
                <option className="bg-gray-900 text-white">Net 30</option>
                <option className="bg-gray-900 text-white">Net 60</option>
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
            disabled={saving || !canCreate}
            className="bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button
            onClick={() => handleSave(false)}
            disabled={saving || !canCreate}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50"
          >
            {saving ? 'Sending...' : 'Send Proposal'}
          </Button>
          <Link href="/proposals">
            <Button className="bg-gray-600 hover:bg-gray-700 text-white">Cancel</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
