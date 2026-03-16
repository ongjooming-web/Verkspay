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
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setClients(data)
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Client'}
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="bg-white mb-8">
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Client Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    required
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button type="submit">Create Client</Button>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Clients List */}
        <div className="space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : clients.length === 0 ? (
            <Card className="bg-white">
              <CardBody>
                <p className="text-gray-600 text-center py-8">No clients yet. Add your first client!</p>
              </CardBody>
            </Card>
          ) : (
            clients.map(client => (
              <Card key={client.id} className="bg-white">
                <CardBody className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{client.name}</h3>
                    <p className="text-gray-600 text-sm">{client.company}</p>
                    <p className="text-gray-600 text-sm">{client.email}</p>
                    {client.phone && <p className="text-gray-600 text-sm">{client.phone}</p>}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(client.id)}
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
