'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { useCurrency } from '@/hooks/useCurrency'

interface Proposal {
  id: string
  proposal_number: string
  client_id: string
  client_name?: string
  title: string
  amount: number
  status: string
  created_at: string
}

export default function Proposals() {
  const { currencyCode } = useCurrency()
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
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('proposals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      // Fetch client details for each proposal
      const proposalsWithClients = await Promise.all(
        data.map(async (proposal) => {
          const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', proposal.client_id)
            .single()
          
          return {
            ...proposal,
            client_name: client?.name || 'Unknown Client'
          }
        })
      )
      setProposals(proposalsWithClients)
    }
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'accepted': return 'bg-green-500/20 border-green-400/30 text-green-300'
      case 'draft': return 'bg-gray-500/20 border-gray-400/30 text-gray-300'
      case 'declined': return 'bg-red-500/20 border-red-400/30 text-red-300'
      default: return 'bg-blue-500/20 border-blue-400/30 text-blue-300'
    }
  }

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent">
            📝 Proposals
          </h1>
          <Button 
            onClick={() => setShowForm(!showForm)}
            className={showForm ? 'bg-red-600/80 hover:bg-red-700/80' : ''}
          >
            {showForm ? '✕ Cancel' : '+ Create Proposal'}
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="mb-8 animate-in fade-in slide-in-from-top-4">
            <CardHeader>
              <h2 className="text-xl font-bold text-white">Create New Proposal</h2>
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
                    type="text"
                    placeholder="Proposal Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                  />
                  <input
                    type="number"
                    placeholder={`Amount (${currencyCode})`}
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                    <option value="accepted" className="bg-slate-900">Accepted</option>
                    <option value="declined" className="bg-slate-900">Declined</option>
                  </select>
                </div>
                <Button type="submit" variant="primary" className="w-full md:w-auto">
                  ✓ Create Proposal
                </Button>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Proposals List */}
        <div className="space-y-4">
          {loading ? (
            <div className="glass px-8 py-12 rounded-lg text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
              <p className="text-gray-300">Loading proposals...</p>
            </div>
          ) : proposals.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-gray-400 text-center py-12 text-lg">
                  {showForm ? 'Create your first proposal above' : 'No proposals yet. Create your first proposal!'}
                </p>
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposals.map((proposal, idx) => (
                <Card 
                  key={proposal.id}
                  className="hover:border-purple-400/50 group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <CardHeader className="border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-white group-hover:text-purple-300 transition-colors">
                        {proposal.proposal_number}
                      </h3>
                      <span className="text-gray-400 text-xs bg-gray-500/20 px-2 py-1 rounded">
                        {proposal.client_name}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-2">{proposal.title}</p>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        ${proposal.amount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(proposal.status)}`}>
                        {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(proposal.id)}
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
