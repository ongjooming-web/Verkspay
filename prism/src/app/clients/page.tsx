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
import { useAutoTag } from '@/hooks/useAutoTag'

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
}

type SortBy = 'name' | 'revenue' | 'outstanding' | 'last_invoice' | 'health'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [healthFilter, setHealthFilter] = useState<'all' | 'healthy' | 'at_risk' | 'needs_attention'>('all')
  const [sortBy, setSortBy] = useState<SortBy>('name')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: ''
  })

  const { tags } = useTags()
  const { currencyCode } = useCurrency()
  const { loading: autoTagLoading, runAutoTagging } = useAutoTag()

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [clients, searchTerm, selectedTags, healthFilter, sortBy])

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
        setClients(data as Client[])
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
      // This would need a JOIN with client_tag_assignments in a real implementation
      // For now, we'll just show a placeholder
    }

    // Health filter
    if (healthFilter !== 'all') {
      filtered = filtered.filter((c) => {
        const score = c.health_score
        if (score === null) return false
        if (healthFilter === 'healthy') return score >= 80
        if (healthFilter === 'at_risk') return score >= 50 && score < 80
        if (healthFilter === 'needs_attention') return score < 50
        return true
      })
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
        case 'health':
          return (b.health_score || 0) - (a.health_score || 0)
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

  const getHealthBadge = (score: number | null) => {
    if (score === null) return { color: 'bg-gray-500/20 text-gray-400', label: 'Not Scored' }
    if (score >= 80) return { color: 'bg-green-500/20 text-green-400', label: 'Healthy' }
    if (score >= 50) return { color: 'bg-yellow-500/20 text-yellow-400', label: 'At Risk' }
    return { color: 'bg-red-500/20 text-red-400', label: 'Needs Attention' }
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
              onClick={runAutoTagging}
              disabled={autoTagLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 text-sm md:text-base px-3 md:px-4 py-2"
            >
              {autoTagLoading ? '🔄 Tagging...' : '⚡ Auto-Tag'}
            </Button>
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
                {/* Tags Filter - Hidden on mobile, shown on larger screens */}
                {tags.length > 0 && (
                  <div className="hidden sm:block">
                    <label className="text-xs text-gray-400 uppercase block mb-2">Tags</label>
                    <select
                      multiple
                      value={selectedTags}
                      onChange={(e) =>
                        setSelectedTags(Array.from(e.target.selectedOptions, (option) => option.value))
                      }
                      className="w-full glass px-3 py-2 rounded-lg text-white text-sm"
                      style={{ minHeight: '80px' }}
                    >
                      {tags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Health Filter */}
                <div>
                  <label className="text-xs text-gray-400 uppercase block mb-2">Health</label>
                  <select
                    value={healthFilter}
                    onChange={(e) => setHealthFilter(e.target.value as typeof healthFilter)}
                    className="w-full glass px-3 py-2 rounded-lg text-white text-sm"
                  >
                    <option value="all">All</option>
                    <option value="healthy">Healthy</option>
                    <option value="at_risk">At Risk</option>
                    <option value="needs_attention">Needs Attn</option>
                  </select>
                </div>

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
                    <option value="health">Health</option>
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
              const healthBadge = getHealthBadge(client.health_score)

              return (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <Card className="border-gray-700/50 hover:border-gray-600/50 cursor-pointer transition">
                    <CardBody>
                      <div className="space-y-3">
                        {/* Name + Health Badge */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-lg font-semibold text-white truncate">{client.name}</h3>
                            {client.company && (
                              <p className="text-gray-400 text-xs md:text-sm truncate">{client.company}</p>
                            )}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap flex-shrink-0 ${healthBadge.color}`}>
                            {healthBadge.label}
                          </div>
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
