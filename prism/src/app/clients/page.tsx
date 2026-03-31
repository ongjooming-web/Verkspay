'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { TagBadge } from '@/components/TagBadge'
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
  // Per-currency breakdowns calculated from live invoices
  revenue_by_currency?: Record<string, number>
  outstanding_by_currency?: Record<string, number>
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
    phone: '',
    industry: '',
    custom_industry: ''
  })

  const { tags } = useTags()
  const { currencyCode } = useCurrency()

  useEffect(() => {
    fetchClients()
  }, [])

  // Realtime: auto-refresh when clients or invoices change
  useEffect(() => {
    let cleanup: (() => void) | undefined
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      const userId = data.user.id
      const channel = supabase
        .channel('clients-realtime')
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'clients',
          filter: `user_id=eq.${userId}`,
        }, () => fetchClients())
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'invoices',
          filter: `user_id=eq.${userId}`,
        }, () => fetchClients())
        .subscribe()
      cleanup = () => supabase.removeChannel(channel)
    })
    return () => cleanup?.()
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

        // Batch fetch all invoices for these clients to compute per-currency revenue/outstanding
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('client_id, amount, amount_paid, remaining_balance, status, currency_code')
          .in('client_id', clientIds)

        // Build per-currency maps per client
        const revenueByCurrencyMap = new Map<string, Record<string, number>>()
        const outstandingByCurrencyMap = new Map<string, Record<string, number>>()

        invoicesData?.forEach((inv: any) => {
          const cid = inv.client_id
          const code = inv.currency_code || 'MYR'

          if (!revenueByCurrencyMap.has(cid)) revenueByCurrencyMap.set(cid, {})
          if (!outstandingByCurrencyMap.has(cid)) outstandingByCurrencyMap.set(cid, {})

          const rev = revenueByCurrencyMap.get(cid)!
          const out = outstandingByCurrencyMap.get(cid)!

          // Revenue = amount_paid (what's been collected)
          if ((inv.amount_paid || 0) > 0) {
            rev[code] = (rev[code] || 0) + (inv.amount_paid || 0)
          }

          // Outstanding = remaining_balance (or full amount for new invoices) for unpaid
          if (inv.status !== 'paid' && inv.status !== 'draft') {
            const balance = inv.remaining_balance != null ? inv.remaining_balance : inv.amount
            if ((balance || 0) > 0) {
              out[code] = (out[code] || 0) + (balance || 0)
            }
          }
        })

        // Attach tags and per-currency data to clients
        const clientsWithTags = data.map((c: any) => ({
          ...c,
          tags: tagMap.get(c.id) || [],
          revenue_by_currency: revenueByCurrencyMap.get(c.id) || {},
          outstanding_by_currency: outstandingByCurrencyMap.get(c.id) || {},
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

      const industry = formData.industry === 'Other' ? formData.custom_industry : formData.industry

      const { error } = await supabase
        .from('clients')
        .insert([
          {
            user_id: userId,
            name: formData.name,
            email: formData.email,
            company: formData.company || null,
            phone: formData.phone || null,
            industry: industry || null
          }
        ])

      if (!error) {
        setFormData({ name: '', email: '', company: '', phone: '', industry: '', custom_industry: '' })
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
      <div className="min-h-screen relative z-10">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6 flex justify-center items-center h-96">
          <div className="text-gray-400">Loading clients...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-10">
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
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value, custom_industry: e.target.value === 'Other' ? formData.custom_industry : '' })}
                  className="w-full glass px-4 py-2 rounded-lg text-white placeholder-gray-500"
                  style={{ backgroundColor: '#1f2937', color: '#fff' }}
                >
                  <option value="" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Select Industry (Optional)</option>
                  <option value="Technology" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Technology</option>
                  <option value="F&B / Hospitality" style={{ backgroundColor: '#1f2937', color: '#fff' }}>F&B / Hospitality</option>
                  <option value="Education / Training" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Education / Training</option>
                  <option value="Retail / E-commerce" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Retail / E-commerce</option>
                  <option value="Marketing / Advertising" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Marketing / Advertising</option>
                  <option value="Design / Creative" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Design / Creative</option>
                  <option value="Construction / Property" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Construction / Property</option>
                  <option value="Healthcare" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Healthcare</option>
                  <option value="Professional Services" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Professional Services</option>
                  <option value="Manufacturing" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Manufacturing</option>
                  <option value="Other" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Other</option>
                </select>
                {formData.industry === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter custom industry"
                    value={formData.custom_industry}
                    onChange={(e) => setFormData({ ...formData, custom_industry: e.target.value })}
                    className="w-full glass px-4 py-2 rounded-lg text-white placeholder-gray-500"
                  />
                )}
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
                      style={{
                        backgroundColor: '#1f2937',
                        color: '#fff'
                      }}
                      className="w-full px-3 py-2 rounded-lg text-white text-sm border border-white/10 hover:border-white/20 focus:border-blue-500 focus:outline-none transition"
                    >
                      <option value="" style={{ backgroundColor: '#1f2937', color: '#fff' }}>All Tags</option>
                      {tags.map((tag) => (
                        <option key={tag.id} value={tag.id} style={{ backgroundColor: '#1f2937', color: '#fff' }}>
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
                    style={{
                      backgroundColor: '#1f2937',
                      color: '#fff'
                    }}
                    className="w-full px-3 py-2 rounded-lg text-white text-sm border border-white/10 hover:border-white/20 focus:border-blue-500 focus:outline-none transition"
                  >
                    <option value="name" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Name</option>
                    <option value="revenue" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Revenue</option>
                    <option value="outstanding" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Outstanding</option>
                    <option value="last_invoice" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Last Invoice</option>
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
                <div key={client.id} className="group">
                  <Card className="border-gray-700/50 hover:border-gray-600/50 transition">
                    <CardBody>
                      <div className="space-y-3">
                        {/* Name + Company + Tags (top row with tags and edit button on right) */}
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-lg font-semibold text-white truncate">{client.name}</h3>
                            {client.company && (
                              <p className="text-gray-400 text-xs md:text-sm truncate">{client.company}</p>
                            )}
                          </div>

                          {/* Tags and Edit Button on the right */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {/* Edit Button */}
                            <Link 
                              href={`/clients/${client.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 transition"
                            >
                              <button
                                type="button"
                                className="text-xs px-2 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition"
                              >
                                ✏️ Edit
                              </button>
                            </Link>

                            {/* Tags */}
                            {client.tags && client.tags.length > 0 && (
                              <div className="flex flex-col items-end gap-1">
                                {client.tags.slice(0, 2).map((tag) => (
                                  <TagBadge key={tag.id} tag={tag} />
                                ))}
                                {client.tags.length > 2 && (
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                    +{client.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Make card clickable to view details */}
                        <Link key={client.id} href={`/clients/${client.id}`} className="absolute inset-0 z-0" />

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

                        {/* Revenue + Outstanding Grid — per invoice currency */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                          <div>
                            <p className="text-gray-400 text-xs uppercase mb-1">Revenue</p>
                            {Object.entries(client.revenue_by_currency || {}).length > 0 ? (
                              Object.entries(client.revenue_by_currency || {}).map(([code, amt]) => (
                                <p key={code} className="text-lg md:text-xl font-bold text-green-400">
                                  {formatCurrency(amt, code)}
                                </p>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">—</p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs uppercase mb-1">Outstanding</p>
                            {Object.entries(client.outstanding_by_currency || {}).length > 0 ? (
                              Object.entries(client.outstanding_by_currency || {}).map(([code, amt]) => (
                                <p key={code} className="text-lg md:text-xl font-bold text-yellow-400">
                                  {formatCurrency(amt, code)}
                                </p>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">—</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
