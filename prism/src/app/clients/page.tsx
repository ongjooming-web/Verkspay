'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'

interface Client {
  id: string
  name: string
  email: string
  company: string
  phone?: string
  created_at: string
  invoiceCount?: number
  proposalCount?: number
  totalRevenue?: number
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      // Fetch stats for each client
      const clientsWithStats = await Promise.all(
        data.map(async (client) => {
          const { data: invoices } = await supabase
            .from('invoices')
            .select('amount')
            .eq('client_id', client.id)

          const { data: proposals } = await supabase
            .from('proposals')
            .select('id')
            .eq('client_id', client.id)

          const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
          const invoiceCount = invoices?.length || 0
          const proposalCount = proposals?.length || 0

          return {
            ...client,
            invoiceCount,
            proposalCount,
            totalRevenue
          }
        })
      )
      setClients(clientsWithStats)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) return

    const { data, error } = await supabase
      .from('clients')
      .insert([
        {
          user_id: userId,
          name: formData.name,
          email: formData.email,
          company: formData.company,
          phone: formData.phone,
        },
      ])
      .select()

    if (data) {
      setClients([data[0], ...clients])
      setFormData({ name: '', email: '', company: '', phone: '' })
      setShowForm(false)
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from('clients').delete().eq('id', id)
    setClients(clients.filter(c => c.id !== id))
  }

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent">
            👥 Clients
          </h1>
          <Button 
            onClick={() => setShowForm(!showForm)}
            className={showForm ? 'bg-red-600/80 hover:bg-red-700/80' : ''}
          >
            {showForm ? '✕ Cancel' : '+ Add Client'}
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="mb-8 animate-in fade-in slide-in-from-top-4">
            <CardHeader>
              <h2 className="text-xl font-bold text-white">Add New Client</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Client Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    required
                    className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <Button type="submit" variant="primary" className="w-full md:w-auto">
                  ✓ Create Client
                </Button>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Clients List */}
        <div className="space-y-4">
          {loading ? (
            <div className="glass px-8 py-12 rounded-lg text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
              <p className="text-gray-300">Loading clients...</p>
            </div>
          ) : clients.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-gray-400 text-center py-12 text-lg">
                  {showForm ? 'Create your first client above' : 'No clients yet. Add your first client to get started!'}
                </p>
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client, idx) => (
                <Card 
                  key={client.id} 
                  className="group hover:shadow-lg hover:border-blue-400/50 hover:scale-105"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <CardHeader className="border-b border-white/10">
                    <h3 className="font-bold text-lg text-white group-hover:text-blue-300 transition-colors">
                      {client.name}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">{client.company}</p>
                  </CardHeader>
                  <CardBody className="space-y-3">
                    <div>
                      <p className="text-gray-400 text-xs">Email</p>
                      <p className="text-gray-200 text-sm font-mono break-all">{client.email}</p>
                    </div>
                    {client.phone && (
                      <div>
                        <p className="text-gray-400 text-xs">Phone</p>
                        <p className="text-gray-200 text-sm">{client.phone}</p>
                      </div>
                    )}
                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-gray-400 text-xs">Invoices</p>
                          <p className="text-blue-300 font-bold">{client.invoiceCount || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Proposals</p>
                          <p className="text-purple-300 font-bold">{client.proposalCount || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Revenue</p>
                          <p className="text-green-300 font-bold text-sm">${(client.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(client.id)}
                        className="w-full hover:border-red-400/50 hover:text-red-300"
                      >
                        🗑 Delete
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
