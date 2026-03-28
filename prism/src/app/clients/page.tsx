'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'
import { formatCurrency } from '@/lib/countries'
import { useTags } from '@/hooks/useTags'
import { useCurrency } from '@/hooks/useCurrency'


interface Tag {
  id: string
  name: string
  color: string
  is_system: boolean
  is_auto: boolean
}

interface Client {
  id: string
  name: string
  email: string
  company: string | null
  phone?: string | null
  created_at: string
  total_revenue: number
  total_outstanding: number
  last_invoice_date: string | null
  invoice_count: number
  health_score: number | null
  tags?: Tag[]
}

type SortBy = 'name' | 'revenue' | 'outstanding' | 'last_invoice'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('name')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: ''
  })

  const { tags } = useTags()
  const { currencyCode } = useCurrency()

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [clients, searchTerm, selectedTags, sortBy])

  const fetchClients = async () => {
    try {
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
        // Batch fetch all tag assignments for these clients
        const clientIds = data.map((c: any) => c.id)
        
        const { data: tagAssignments } = await supabase
          .from('client_tag_assignments')
          .select('client_id, client_tags(id, name, color, is_system), is_auto')
          .in('client_id', clientIds)

        // Create a map of client_id -> tags
        const tagMap = new Map<string, Tag[]>()
        tagAssignments?.forEach((assignment: any) => {
          const clientId = assignment.client_id
          const tag: Tag = {
            id: assignment.client_tags.id,
            name: assignment.client_tags.name,
            color: assignment.client_tags.color,
            is_system: assignment.client_tags.is_system,
            is_auto: assignment.is_auto
          }
          
          if (!tagMap.has(clientId)) {
            tagMap.set(clientId, [])
          }
          tagMap.get(clientId)!.push(tag)
        })

        // Attach tags to clients
        const clientsWithTags = data.map((c: any) => ({
          ...c,
          tags: tagMap.get(c.id) || []
        }))

        setClients(clientsWithTags as Client[])
      }
    } catch (err) {
      console.error('[ClientsList] Error fetching clients:', err)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...clients]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term)
      )
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((c) =>
        c.tags && c.tags.some((tag) => selectedTags.includes(tag.id))
      )
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'revenue':
          return (b.total_revenue || 0) - (a.total_revenue || 0)
        case 'outstanding':
          return (b.total_outstanding || 0) - (a.total_outstanding || 0)
        case 'last_invoice':
          const dateA = a.last_invoice_date ? new Date(a.last_invoice_date).getTime() : 0
          const dateB = b.last_invoice_date ? new Date(b.last_invoice_date).getTime() : 0
          return dateB - dateA
        default:
          return 0
      }
    })

    setFilteredClients(filtered)
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      if (!userId) return

      const { error } = await supabase
        .from('clients')
        .insert([
          {
            user_id: userId,
            name: formData.name,
            email: formData.email,
            company: formData.company || null,
            phone: formData.phone || null
          }
        ])

      if (!error) {
        setFormData({ name: '', email: '', company: '', phone: '' })
        setShowForm(false)
        fetchClients()
      }
    } catch (err) {
      console.error('[ClientsList] Error adding client:', err)
    }
  }

  const getLastInvoiceText = (date: string | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const invoiceDate = new Date(date)
    const days = Math.floor((now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return `${Math.floor(days / 30)} months ago`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6 flex justify-center items-center h-96">
          <div className="text-gray-400">Loading clients...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Clients</h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base px-3 md:px-4 py-2"
            >
              + Add Client
            </Button>
          </div>
        </div>

        {/* Add Client Form */}
        {showForm && (
          <Card className="mb-8 border-blue-500/30">
            <CardBody>
              <form onSubmit={handleAddClient} className="space-y-4">
                <input
                  type="text"
                  placeholder="Client Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full glass px-4 py-2 rounded-lg text-white placeholder-gray-500"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full glass px-4 py-2 rounded-lg text-white placeholder-gray-500"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full glass px-4 py-2 rounded-lg text-white placeholder-gray-500"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full glass px-4 py-2 rounded-lg text-white placeholder-gray-500"
                />
                <div className="flex gap-3">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Add Client
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-8 border-gray-700/50">
          <CardBody>
            <div className="space-y-3 md:space-y-4">
              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full glass px-3 md:px-4 py-2 rounded-lg text-white placeholder-gray-500 text-sm"
                />
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {/* Tags Filter Dropdown */}
                {tags.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase block mb-2">Tags</label>
                    <select
                      value={selectedTags[0] || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedTags([e.target.value])
                        } else {
                          setSelectedTags([])
                        }
                      }}
                      className="w-full glass px-3 py-2 rounded-lg text-white text-sm"
                    >
                      <option value="">All Tags</option>
                      {tags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sort By */}
                <div>
                  <label className="text-xs text-gray-400 uppercase block mb-2">Sort</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="w-full glass px-3 py-2 rounded-lg text-white text-sm"
                  >
                    <option value="name">Name</option>
                    <option value="revenue">Revenue</option>
                    <option value="outstanding">Outstanding</option>
                    <option value="last_invoice">Last Invoice</option>
                  </select>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Client List */}
        {filteredClients.length === 0 ? (
          <Card className="border-gray-700/50">
            <CardBody>
              <div className="text-center py-8 md:py-12">
                <p className="text-gray-400 mb-4 text-sm md:text-base">No clients found</p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base"
                >
                  Add First Client
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => {
              return (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <Card className="border-gray-700/50 hover:border-gray-600/50 cursor-pointer transition">
                    <CardBody>
                      <div className="space-y-3">
                        {/* Name + Company + Tags (top row with tags on right) */}
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-lg font-semibold text-white truncate">{client.name}</h3>
                            {client.company && (
                              <p className="text-gray-400 text-xs md:text-sm truncate">{client.company}</p>
                            )}
                          </div>

                          {/* Tags on the right */}
                          {client.tags && client.tags.length > 0 && (
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {client.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
                                  style={{ backgroundColor: tag.color + '30', color: tag.color }}
                                >
                                  {tag.is_auto && tag.is_system && <span>⚡</span>}
                                  {tag.is_auto && !tag.is_system && <span>✨</span>}
                                  <span className="truncate max-w-[80px]">{tag.name}</span>
                                </span>
                              ))}
                              {client.tags.length > 2 && (
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                  +{client.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Contact Info - Grid Layout */}
                        <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                          {client.email && (
                            <div className="text-gray-400">
                              <span className="block text-gray-500 text-xs mb-1">Email</span>
                              <span className="text-white truncate block">{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="text-gray-400">
                              <span className="block text-gray-500 text-xs mb-1">Phone</span>
                              <span className="text-white truncate block">{client.phone}</span>
                            </div>
                          )}
                          {client.last_invoice_date && (
                            <div className="text-gray-400">
                              <span className="block text-gray-500 text-xs mb-1">Last Invoice</span>
                              <span className="text-white">{getLastInvoiceText(client.last_invoice_date)}</span>
                            </div>
                          )}
                        </div>

                        {/* Revenue + Outstanding Grid */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                          <div>
                            <p className="text-gray-400 text-xs uppercase mb-1">Revenue</p>
                            <p className="text-lg md:text-xl font-bold text-green-400">
                              {formatCurrency(client.total_revenue || 0, currencyCode)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs uppercase mb-1">Outstanding</p>
                            <p className="text-lg md:text-xl font-bold text-yellow-400">
                              {formatCurrency(client.total_outstanding || 0, currencyCode)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
