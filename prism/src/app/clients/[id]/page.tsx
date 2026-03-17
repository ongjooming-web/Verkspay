'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'

interface Client {
  id: string
  name: string
  email: string
  company: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  notes?: string
  last_contact_date?: string
  created_at: string
}

interface Invoice {
  id: string
  invoice_number: string
  amount: number
  status: string
  due_date: string
  created_at: string
}

interface Proposal {
  id: string
  proposal_number: string
  title: string
  amount: number
  status: string
  created_at: string
}

interface Note {
  id: string
  note_text: string
  note_type: string
  created_at: string
}

export default function ClientDetail() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('general')

  useEffect(() => {
    fetchClientDetails()
    fetchClientInvoices()
    fetchClientProposals()
    fetchClientNotes()
  }, [clientId])

  const fetchClientDetails = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single()

    if (data) {
      setClient(data)
      setEditData(data)
    }
    setLoading(false)
  }

  const fetchClientInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (data) setInvoices(data)
  }

  const fetchClientProposals = async () => {
    const { data } = await supabase
      .from('proposals')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (data) setProposals(data)
  }

  const fetchClientNotes = async () => {
    const { data } = await supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (data) setNotes(data)
  }

  const handleUpdateClient = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId || !client) return

    const { error } = await supabase
      .from('clients')
      .update({
        name: editData.name,
        email: editData.email,
        company: editData.company,
        phone: editData.phone,
        address: editData.address,
        city: editData.city,
        state: editData.state,
        zip_code: editData.zip_code,
        country: editData.country,
        notes: editData.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .eq('user_id', userId)

    if (!error) {
      await fetchClientDetails()
      setIsEditing(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) return

    const { error } = await supabase
      .from('client_notes')
      .insert([
        {
          user_id: userId,
          client_id: clientId,
          note_text: newNote,
          note_type: noteType
        }
      ])

    if (!error) {
      await fetchClientNotes()
      setNewNote('')
      setNoteType('general')
    }
  }

  const handleDeleteClient = async () => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) return

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) return

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('user_id', userId)

    if (!error) {
      router.push('/clients')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    await supabase.from('client_notes').delete().eq('id', noteId)
    setNotes(notes.filter(n => n.id !== noteId))
  }

  if (loading) {
    return (
      <div className="min-h-screen relative z-10">
        <Navigation />
        <div className="flex justify-center items-center h-screen">
          <div className="glass px-8 py-6 rounded-lg">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
              <p className="text-gray-300">Loading client...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen relative z-10">
        <Navigation />
        <div className="flex justify-center items-center h-screen">
          <div className="glass px-8 py-6 rounded-lg">
            <div className="text-center">
              <p className="text-red-300 mb-4">Client not found</p>
              <Link href="/clients">
                <Button>← Back to Clients</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0)

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />

      <div className="max-w-5xl mx-auto px-6 pb-12">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 gap-4 flex-col md:flex-row">
          <Link href="/clients">
            <Button variant="outline">← Back</Button>
          </Link>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button 
                  onClick={handleUpdateClient}
                  className="bg-green-600/80 hover:bg-green-700/80"
                >
                  ✓ Save
                </Button>
                <Button 
                  onClick={() => setIsEditing(false)}
                  className="bg-red-600/80 hover:bg-red-700/80"
                >
                  ✕ Cancel
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600/80 hover:bg-blue-700/80"
                >
                  ✎ Edit
                </Button>
                <Button 
                  onClick={handleDeleteClient}
                  className="bg-red-600/80 hover:bg-red-700/80"
                >
                  🗑 Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Client Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <h1 className="text-4xl font-bold text-white mb-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="glass w-full px-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                />
              ) : (
                client.name
              )}
            </h1>
            <p className="text-gray-400">{client.company}</p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-4">📋 Contact Information</h3>
                
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                    />
                  ) : (
                    <p className="text-white break-all">{client.email}</p>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 text-sm block mb-2">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                    />
                  ) : (
                    <p className="text-white">{client.phone || '—'}</p>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 text-sm block mb-2">Company</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.company}
                      onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                      className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                    />
                  ) : (
                    <p className="text-white">{client.company}</p>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-4">📍 Address</h3>
                
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Street Address</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.address || ''}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                    />
                  ) : (
                    <p className="text-white">{client.address || '—'}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">City</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.city || ''}
                        onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                        className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                      />
                    ) : (
                      <p className="text-white">{client.city || '—'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">State</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.state || ''}
                        onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                        className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                      />
                    ) : (
                      <p className="text-white">{client.state || '—'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">ZIP Code</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.zip_code || ''}
                        onChange={(e) => setEditData({ ...editData, zip_code: e.target.value })}
                        className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                      />
                    ) : (
                      <p className="text-white">{client.zip_code || '—'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Country</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.country || ''}
                        onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                        className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                      />
                    ) : (
                      <p className="text-white">{client.country || '—'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {isEditing && (
              <div className="border-t border-white/10 pt-6">
                <label className="text-gray-400 text-sm block mb-2">Internal Notes</label>
                <textarea
                  value={editData.notes || ''}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={4}
                  className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                />
              </div>
            )}
          </CardBody>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="hover:scale-105 hover:border-green-400/50">
            <CardBody>
              <p className="text-gray-400 text-sm mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-green-400">${totalRevenue.toFixed(2)}</p>
            </CardBody>
          </Card>
          <Card className="hover:scale-105 hover:border-blue-400/50">
            <CardBody>
              <p className="text-gray-400 text-sm mb-2">Total Invoices</p>
              <p className="text-3xl font-bold text-blue-400">{invoices.length}</p>
            </CardBody>
          </Card>
          <Card className="hover:scale-105 hover:border-purple-400/50">
            <CardBody>
              <p className="text-gray-400 text-sm mb-2">Total Proposals</p>
              <p className="text-3xl font-bold text-purple-400">{proposals.length}</p>
            </CardBody>
          </Card>
        </div>

        {/* Add Note Section */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">➕ Add Note</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <input
                  type="text"
                  placeholder="Add a note about this client..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                />
              </div>
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className="glass px-4 py-3 rounded-lg text-white focus:outline-none focus:border-blue-400/50 appearance-none"
              >
                <option value="general" className="bg-slate-900">General</option>
                <option value="call" className="bg-slate-900">Call</option>
                <option value="email" className="bg-slate-900">Email</option>
                <option value="meeting" className="bg-slate-900">Meeting</option>
              </select>
            </div>
            <Button 
              onClick={handleAddNote}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              ✓ Add Note
            </Button>
          </CardBody>
        </Card>

        {/* Contact History */}
        {notes.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <h2 className="text-2xl font-bold text-white">📅 Contact History</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="glass rounded-lg p-4 border-blue-400/20 hover:border-blue-400/50 transition-all">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                          {note.note_type.toUpperCase()}
                        </span>
                        <span className="text-gray-400 text-sm">{new Date(note.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-white">{note.note_text}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteNote(note.id)}
                      className="hover:border-red-400/50 hover:text-red-300"
                    >
                      🗑
                    </Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {/* Invoices */}
        {invoices.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <h2 className="text-2xl font-bold text-white">📄 Invoices</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {invoices.map((invoice) => (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                  <div className="glass rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-semibold">{invoice.invoice_number}</p>
                        <p className="text-gray-400 text-sm">{new Date(invoice.due_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg">${invoice.amount.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                          invoice.status === 'paid' 
                            ? 'bg-green-500/20 border-green-400/30 text-green-300'
                            : 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                        }`}>
                          {invoice.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </CardBody>
          </Card>
        )}

        {/* Proposals */}
        {proposals.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-bold text-white">📝 Proposals</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="glass rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-semibold">{proposal.proposal_number}</p>
                      <p className="text-gray-400 text-sm">{proposal.title}</p>
                      <p className="text-gray-400 text-sm">{new Date(proposal.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">${proposal.amount.toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full border ${
                        proposal.status === 'accepted'
                          ? 'bg-green-500/20 border-green-400/30 text-green-300'
                          : 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                      }`}>
                        {proposal.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}
