'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { TagBadge } from '@/components/TagBadge'
import { useCurrency } from '@/hooks/useCurrency'
import { useClientTags } from '@/hooks/useClientTags'
import { useClientNotes } from '@/hooks/useClientNotes'
import { useClientStats } from '@/hooks/useClientStats'
import { useAISummary } from '@/hooks/useAISummary'
import { useGrowthOpportunities } from '@/hooks/useGrowthOpportunities'
import { formatCurrency } from '@/lib/countries'
import ReactMarkdown from 'react-markdown'

interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  total_revenue: number
  total_outstanding: number
  last_invoice_date: string | null
  invoice_count: number
  health_score: number | null
}

export default function ClientProfilePage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'activity' | 'notes' | 'insights'>('activity')
  const [invoices, setInvoices] = useState<any[]>([])
  const [proposals, setProposals] = useState<any[]>([])

  const { currencyCode } = useCurrency()
  const { tags } = useClientTags(clientId)
  const { notes, addNote, updateNote, deleteNote } = useClientNotes(clientId)
  const { triggerAggregation } = useClientStats(clientId)
  const { data: aiSummaryData, loading: aiSummaryLoading, error: aiSummaryError, isFresh: aiSummaryIsFresh, remaining: aiSummaryRemaining, isLocked: aiSummaryIsLocked, generateSummary } = useAISummary(clientId)
  const { data: growthOppData, loading: growthOppLoading, error: growthOppError, isFresh: growthOppIsFresh, remaining: growthOppRemaining, isLocked: growthOppIsLocked, generateOpportunities } = useGrowthOpportunities(clientId)

  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) {
          router.push('/login')
          return
        }

        setUser(userData.user)

        // Fetch client
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .eq('user_id', userData.user.id)
          .single()

        if (clientError || !clientData) {
          router.push('/clients')
          return
        }

        setClient(clientData)

        // Fetch invoices for this client
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('id, invoice_number, status, amount, amount_paid, created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })

        setInvoices(invoicesData || [])

        // Fetch proposals for this client
        const { data: proposalsData } = await supabase
          .from('proposals')
          .select('id, proposal_number, status, total_amount, created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })

        setProposals(proposalsData || [])
      } catch (err) {
        console.error('[ClientProfile] Error:', err)
        router.push('/clients')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clientId, router])

  if (loading || !client) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6 flex justify-center items-center h-96">
          <div className="text-gray-400">Loading client profile...</div>
        </div>
      </div>
    )
  }

  const getHealthScoreBadge = (score: number | null) => {
    if (score === null) return { color: 'bg-gray-500/20 text-gray-400', label: 'Not Scored' }
    if (score >= 80) return { color: 'bg-green-500/20 text-green-400', label: `Healthy (${score})` }
    if (score >= 50) return { color: 'bg-yellow-500/20 text-yellow-400', label: `At Risk (${score})` }
    return { color: 'bg-red-500/20 text-red-400', label: `Needs Attention (${score})` }
  }

  const healthBadge = getHealthScoreBadge(client?.health_score || null)

  const calculatePaymentSpeed = () => {
    if (invoices.length === 0) return null
    // Placeholder: actual calculation would need payment_records
    return 7 // days average
  }

  const paymentSpeed = calculatePaymentSpeed()

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteContent.trim()) return

    try {
      await addNote(newNoteContent)
      setNewNoteContent('')
    } catch (err) {
      console.error('[ClientProfile] Error adding note:', err)
    }
  }

  const handleEditNote = async (noteId: string) => {
    if (!editingNoteContent.trim()) return

    try {
      await updateNote(noteId, editingNoteContent)
      setEditingNoteId(null)
      setEditingNoteContent('')
    } catch (err) {
      console.error('[ClientProfile] Error editing note:', err)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return

    try {
      await deleteNote(noteId)
    } catch (err) {
      console.error('[ClientProfile] Error deleting note:', err)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-6xl mx-auto p-6 md:p-8">
        {/* Client Header */}
        <Card className="mb-8 border-blue-500/30">
          <CardHeader>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{client.name}</h1>
                <p className="text-gray-400">{client.company || 'No company listed'}</p>
              </div>
              <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${healthBadge.color}`}>
                {healthBadge.label}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {client.email && (
                <div>
                  <p className="text-gray-400 text-xs uppercase">Email</p>
                  <p className="text-white">{client.email}</p>
                </div>
              )}
              {client.phone && (
                <div>
                  <p className="text-gray-400 text-xs uppercase">Phone</p>
                  <Link href={`https://wa.me/${client.phone.replace(/[^\d]/g, '')}`} target="_blank">
                    <p className="text-blue-400 hover:text-blue-300">{client.phone}</p>
                  </Link>
                </div>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} />
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-3 flex-wrap">
              <Link href={`/invoices?client=${clientId}`}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">📄 New Invoice</Button>
              </Link>
              <Link href={`/proposals/new?client=${clientId}`}>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">📋 New Proposal</Button>
              </Link>
              {client.phone && (
                <Link href={`https://wa.me/${client.phone.replace(/[^\d]/g, '')}`} target="_blank">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">💬 WhatsApp</Button>
                </Link>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-gray-700/50">
            <CardBody>
              <p className="text-gray-400 text-xs uppercase">Total Revenue</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(client.total_revenue, currencyCode)}
              </p>
            </CardBody>
          </Card>

          <Card className="border-gray-700/50">
            <CardBody>
              <p className="text-gray-400 text-xs uppercase">Outstanding</p>
              <p className="text-2xl font-bold text-yellow-400">
                {formatCurrency(client.total_outstanding, currencyCode)}
              </p>
            </CardBody>
          </Card>

          <Card className="border-gray-700/50">
            <CardBody>
              <p className="text-gray-400 text-xs uppercase">Avg Invoice</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(
                  client.invoice_count > 0 ? client.total_revenue / client.invoice_count : 0,
                  currencyCode
                )}
              </p>
            </CardBody>
          </Card>

          <Card className="border-gray-700/50">
            <CardBody>
              <p className="text-gray-400 text-xs uppercase">Payment Speed</p>
              <p className="text-2xl font-bold text-blue-400">
                {paymentSpeed ? `${paymentSpeed} days` : 'N/A'}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="border-gray-700/50">
          <CardBody>
            {/* Tab Buttons */}
            <div className="flex gap-4 border-b border-gray-700/50 pb-4 mb-6">
              <button
                onClick={() => setActiveTab('activity')}
                className={`pb-2 px-1 transition ${
                  activeTab === 'activity'
                    ? 'border-b-2 border-blue-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Activity Timeline
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 px-1 transition ${
                  activeTab === 'notes'
                    ? 'border-b-2 border-blue-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Notes
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`pb-2 px-1 transition ${
                  activeTab === 'insights'
                    ? 'border-b-2 border-blue-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                AI Insights
              </button>
            </div>

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                {[...invoices, ...proposals].length === 0 ? (
                  <p className="text-gray-400 text-sm">No activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {[...invoices.map((inv) => ({ type: 'invoice', ...inv })), ...proposals.map((prop) => ({ type: 'proposal', ...prop }))]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((item, idx) => (
                        <Link
                          key={idx}
                          href={
                            item.type === 'invoice'
                              ? `/invoices/${item.id}`
                              : `/proposals/${item.id}`
                          }
                        >
                          <div className="p-3 bg-gray-900/50 rounded hover:bg-gray-800/50 cursor-pointer transition">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-white font-mono text-sm">
                                  {item.type === 'invoice' ? item.invoice_number : item.proposal_number}
                                </p>
                                <p className="text-gray-400 text-xs mt-1">
                                  {new Date(item.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-white font-semibold">
                                  {formatCurrency(item.total_amount || item.amount || 0, currencyCode)}
                                </p>
                                <span className="text-xs px-2 py-1 rounded bg-gray-700/50 text-gray-300">
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-3 pb-6 border-b border-gray-700/50">
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full bg-gray-900/50 border border-gray-700/50 rounded px-3 py-2 text-white placeholder-gray-500 text-sm resize-none"
                    rows={3}
                  />
                  <Button
                    disabled={!newNoteContent.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  >
                    Add Note
                  </Button>
                </form>

                {/* Notes List */}
                {notes.length === 0 ? (
                  <p className="text-gray-400 text-sm">No notes yet</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3 bg-gray-900/50 rounded">
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingNoteContent}
                              onChange={(e) => setEditingNoteContent(e.target.value)}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm resize-none"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleEditNote(note.id)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                              >
                                Save
                              </Button>
                              <Button
                                onClick={() => setEditingNoteId(null)}
                                className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-white text-sm mb-2">{note.content}</p>
                            <div className="flex justify-between items-center">
                              <p className="text-gray-500 text-xs">
                                {new Date(note.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingNoteId(note.id)
                                    setEditingNoteContent(note.content)
                                  }}
                                  className="text-blue-400 hover:text-blue-300 text-xs"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Insights Tab */}
            {activeTab === 'insights' && (
              <div className="space-y-6">
                {/* AI Client Summary */}
                <Card className="border-blue-500/30">
                  <CardHeader>
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">📊 AI Client Summary</h3>
                        {aiSummaryData && !aiSummaryLoading && (
                          <p className="text-xs text-gray-400 mt-1">
                            {aiSummaryIsFresh ? '✓ Fresh' : '⚠️ Cached (7+ days old)'}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {aiSummaryRemaining !== null && (
                          <p className={`text-xs mb-2 ${aiSummaryRemaining === 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {aiSummaryRemaining} remaining
                          </p>
                        )}
                        <Button
                          onClick={generateSummary}
                          disabled={!!(aiSummaryLoading || (aiSummaryData && aiSummaryIsFresh) || aiSummaryRemaining === 0)}
                          className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 text-sm"
                        >
                          {aiSummaryLoading ? 'Generating...' : 'Generate'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {aiSummaryIsLocked && (
                      <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700/50">
                        <p className="text-gray-400 text-sm mb-3">
                          AI Client Summaries require <span className="font-semibold text-blue-400">Pro plan</span> or higher
                        </p>
                        <p className="text-gray-500 text-xs">
                          Get AI-powered insights about your client's payment patterns, engagement, and business health.
                        </p>
                      </div>
                    )}

                    {!aiSummaryIsLocked && aiSummaryError && (
                      <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30">
                        <p className="text-red-400 text-sm">{aiSummaryError}</p>
                        {aiSummaryRemaining === 0 && (
                          <p className="text-red-400 text-xs mt-2">Your monthly limit has been reached. Please try again next month.</p>
                        )}
                      </div>
                    )}

                    {!aiSummaryIsLocked && aiSummaryLoading && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                        <span className="text-gray-400 text-sm">Analyzing client data...</span>
                      </div>
                    )}

                    {!aiSummaryIsLocked && aiSummaryData && (
                      <div className="space-y-4">
                        <ReactMarkdown className="prose prose-invert max-w-none text-sm prose-headings:text-gray-200 prose-headings:font-semibold prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-gray-100">
                          {aiSummaryData.summary}
                        </ReactMarkdown>
                      </div>
                    )}

                    {!aiSummaryIsLocked && !aiSummaryData && !aiSummaryLoading && !aiSummaryError && (
                      <p className="text-gray-400 text-sm">Click "Generate" to analyze this client with AI</p>
                    )}
                  </CardBody>
                </Card>

                {/* Growth Opportunities */}
                <Card className="border-purple-500/30">
                  <CardHeader>
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">💡 Growth Opportunities</h3>
                        {growthOppData && !growthOppLoading && (
                          <p className="text-xs text-gray-400 mt-1">
                            {growthOppIsFresh ? '✓ Fresh' : '⚠️ Cached (7+ days old)'}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {growthOppRemaining !== null && (
                          <p className={`text-xs mb-2 ${growthOppRemaining === 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {growthOppRemaining} remaining
                          </p>
                        )}
                        <Button
                          onClick={generateOpportunities}
                          disabled={!!(growthOppLoading || (growthOppData && growthOppIsFresh) || growthOppRemaining === 0)}
                          className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 text-sm"
                        >
                          {growthOppLoading ? 'Generating...' : 'Generate'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {growthOppIsLocked && (
                      <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700/50">
                        <p className="text-gray-400 text-sm mb-3">
                          Growth Opportunities require <span className="font-semibold text-purple-400">Enterprise plan</span>
                        </p>
                        <p className="text-gray-500 text-xs">
                          Discover expansion opportunities, identify at-risk accounts, and optimize client relationships.
                        </p>
                      </div>
                    )}

                    {!growthOppIsLocked && growthOppError && (
                      <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30">
                        <p className="text-red-400 text-sm">{growthOppError}</p>
                        {growthOppRemaining === 0 && (
                          <p className="text-red-400 text-xs mt-2">Your monthly limit has been reached. Please try again next month.</p>
                        )}
                      </div>
                    )}

                    {!growthOppIsLocked && growthOppLoading && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
                        <span className="text-gray-400 text-sm">Analyzing growth potential...</span>
                      </div>
                    )}

                    {!growthOppIsLocked && growthOppData && (
                      <div className="space-y-4">
                        {growthOppData.engagement_score > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-700/50">
                            <div className="p-3 bg-gray-900/50 rounded">
                              <p className="text-xs uppercase text-gray-400 mb-1">Engagement Score</p>
                              <p className="text-3xl font-bold text-purple-400">{growthOppData.engagement_score}/100</p>
                            </div>
                            <div className="p-3 bg-gray-900/50 rounded">
                              <p className="text-xs uppercase text-gray-400 mb-1">Monthly Average</p>
                              <p className="text-2xl font-bold text-green-400">
                                {formatCurrency(growthOppData.monthly_average, currencyCode)}
                              </p>
                            </div>
                          </div>
                        )}
                        <ReactMarkdown className="prose prose-invert max-w-none text-sm prose-headings:text-gray-200 prose-headings:font-semibold prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-gray-100">
                          {growthOppData.opportunities}
                        </ReactMarkdown>
                      </div>
                    )}

                    {!growthOppIsLocked && !growthOppData && !growthOppLoading && !growthOppError && (
                      <p className="text-gray-400 text-sm">Click "Generate" to identify growth opportunities</p>
                    )}
                  </CardBody>
                </Card>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card className="border-gray-700/50">
            <CardHeader>
              <h3 className="text-lg font-bold text-white">Recent Invoices</h3>
            </CardHeader>
            <CardBody>
              {invoices.slice(0, 5).length === 0 ? (
                <p className="text-gray-400 text-sm">No invoices</p>
              ) : (
                <div className="space-y-2">
                  {invoices.slice(0, 5).map((inv) => (
                    <Link key={inv.id} href={`/invoices/${inv.id}`}>
                      <div className="flex justify-between text-sm hover:bg-gray-900/50 p-2 rounded cursor-pointer">
                        <span className="text-white font-mono">{inv.invoice_number}</span>
                        <span className="text-gray-400">
                          {formatCurrency(inv.amount, currencyCode)}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {invoices.length > 5 && (
                    <Link href={`/invoices?client=${clientId}`}>
                      <p className="text-blue-400 hover:text-blue-300 text-sm">View All →</p>
                    </Link>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="border-gray-700/50">
            <CardHeader>
              <h3 className="text-lg font-bold text-white">Recent Proposals</h3>
            </CardHeader>
            <CardBody>
              {proposals.slice(0, 5).length === 0 ? (
                <p className="text-gray-400 text-sm">No proposals</p>
              ) : (
                <div className="space-y-2">
                  {proposals.slice(0, 5).map((prop) => (
                    <Link key={prop.id} href={`/proposals/${prop.id}`}>
                      <div className="flex justify-between text-sm hover:bg-gray-900/50 p-2 rounded cursor-pointer">
                        <span className="text-white font-mono">{prop.proposal_number}</span>
                        <span className="text-gray-400">
                          {formatCurrency(prop.total_amount, currencyCode)}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {proposals.length > 5 && (
                    <Link href={`/proposals?client=${clientId}`}>
                      <p className="text-blue-400 hover:text-blue-300 text-sm">View All →</p>
                    </Link>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
