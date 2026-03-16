'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'

interface Proposal {
  id: string
  proposal_number: string
  client_id: string
  title: string
  amount: number
  status: string
  created_at: string
}

export default function Proposals() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    amount: '',
    status: 'draft',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProposals()
    fetchClients()
  }, [])

  const fetchProposals = async () => {
    const { data } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setProposals(data)
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

    const proposalNumber = `PRO-${Date.now()}`
    const { data, error } = await supabase
      .from('proposals')
      .insert([
        {
          user_id: userId,
          proposal_number: proposalNumber,
          client_id: formData.client_id,
          title: formData.title,
          amount: parseFloat(formData.amount),
          status: formData.status,
        },
      ])
      .select()

    if (data) {
      setProposals([data[0], ...proposals])
      setFormData({ client_id: '', title: '', amount: '', status: 'draft' })
      setShowForm(false)
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from('proposals').delete().eq('id', id)
    setProposals(proposals.filter(p => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Proposals</h1>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Create Proposal'}
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
                    type="text"
                    placeholder="Proposal Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
                <Button type="submit">Create Proposal</Button>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Proposals List */}
        <div className="space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : proposals.length === 0 ? (
            <Card className="bg-white">
              <CardBody>
                <p className="text-gray-600 text-center py-8">No proposals yet. Create your first proposal!</p>
              </CardBody>
            </Card>
          ) : (
            proposals.map(proposal => (
              <Card key={proposal.id} className="bg-white">
                <CardBody className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{proposal.proposal_number}</h3>
                    <p className="text-gray-600">{proposal.title}</p>
                    <p className="text-gray-600 text-sm">${proposal.amount.toFixed(2)}</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${
                      proposal.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      proposal.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      proposal.status === 'declined' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(proposal.id)}
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
