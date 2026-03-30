'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Button } from '@/components/Button'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { formatCurrency } from '@/lib/countries'
import { useCurrency } from '@/hooks/useCurrency'

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  industry?: string
  created_at: string
}

interface Stats {
  totalRevenue: number
  totalOutstanding: number
  avgInvoice: number
  paymentSpeed: number
  invoiceCount: number
}

export default function ClientDetail() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const { currencyCode } = useCurrency()

  const [client, setClient] = useState<Client | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPortalModal, setShowPortalModal] = useState(false)
  const [portalLink, setPortalLink] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push('/login')
          return
        }

        // Fetch client
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .eq('user_id', user.id)
          .single()

        if (clientError || !clientData) {
          setError('Client not found')
          return
        }

        setClient(clientData)

        // Fetch invoices for stats
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('amount, status, created_at, due_date, paid_date')
          .eq('client_id', clientId)
          .eq('user_id', user.id)

        if (!invoicesError && invoices) {
          const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
          const paidInvoices = invoices.filter(inv => inv.status === 'paid')
          const totalOutstanding = invoices
            .filter(inv => inv.status === 'unpaid' || inv.status === 'overdue')
            .reduce((sum, inv) => sum + (inv.amount || 0), 0)
          const avgInvoice = invoices.length > 0 ? totalRevenue / invoices.length : 0

          // Calculate payment speed (days between invoice and payment)
          let totalDays = 0
          let paidCount = 0
          invoices.forEach(inv => {
            if (inv.paid_date && inv.created_at) {
              const created = new Date(inv.created_at).getTime()
              const paid = new Date(inv.paid_date).getTime()
              totalDays += Math.floor((paid - created) / (1000 * 60 * 60 * 24))
              paidCount++
            }
          })
          const paymentSpeed = paidCount > 0 ? Math.round(totalDays / paidCount) : 0

          setStats({
            totalRevenue,
            totalOutstanding,
            avgInvoice,
            paymentSpeed,
            invoiceCount: invoices.length,
          })
        }
      } catch (err) {
        console.error('[ClientDetail] Error:', err)
        setError('Failed to load client')
      } finally {
        setLoading(false)
      }
    }

    fetchClientData()
  }, [clientId, router])

  const generatePortalLink = async () => {
    if (!client) return

    setGeneratingLink(true)
    try {
      // Get auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/client-portal/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          client_id: client.id,
          client_email: client.email,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate link')
      }

      const data = await response.json()
      setPortalLink(data.portal_url)
      setShowPortalModal(true)
    } catch (err) {
      console.error('[ClientDetail] Error:', err)
      alert(`Failed to generate portal link: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setGeneratingLink(false)
    }
  }

  const copyToClipboard = () => {
    if (portalLink) {
      navigator.clipboard.writeText(portalLink)
      alert('Link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative z-10">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading client...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="min-h-screen relative z-10">
        <Navigation />
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error || 'Client not found'}</p>
            <Link href="/clients">
              <Button>← Back to Clients</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header with Edit Button */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link href="/clients" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              ← Back to Clients
            </Link>
            <h1 className="text-4xl font-bold text-white mt-2">{client.name}</h1>
            {client.company && (
              <p className="text-gray-400 text-lg mt-1">{client.company}</p>
            )}
            {client.industry && (
              <p className="text-gray-400 text-sm mt-1">Industry: {client.industry}</p>
            )}
          </div>

          {/* Edit Button */}
          <Link href={`/clients/${clientId}/edit`}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              ✏️ Edit Client
            </Button>
          </Link>
        </div>

        {/* Contact Info */}
        <Card className="mb-8">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-gray-400 text-sm uppercase mb-2">Email</p>
                <p className="text-white text-lg">{client.email}</p>
              </div>
              {client.phone && (
                <div>
                  <p className="text-gray-400 text-sm uppercase mb-2">Phone</p>
                  <p className="text-white text-lg">{client.phone}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardBody>
                <p className="text-gray-400 text-sm uppercase mb-2">Total Revenue</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(stats.totalRevenue, currencyCode)}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-gray-400 text-sm uppercase mb-2">Outstanding</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {formatCurrency(stats.totalOutstanding, currencyCode)}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-gray-400 text-sm uppercase mb-2">Avg Invoice</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.avgInvoice, currencyCode)}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-gray-400 text-sm uppercase mb-2">Payment Speed</p>
                <p className="text-2xl font-bold text-blue-400">
                  {stats.paymentSpeed} days
                </p>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <Button className="bg-blue-600 hover:bg-blue-700">
            📄 New Invoice
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            📋 New Proposal
          </Button>
          <Button 
            onClick={generatePortalLink}
            disabled={generatingLink}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {generatingLink ? '⏳ Generating...' : '🔗 Share Portal Link'}
          </Button>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            💬 WhatsApp
          </Button>
        </div>

        {/* Portal Link Modal */}
        {showPortalModal && portalLink && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <h2 className="text-xl font-bold text-white">Share Portal Link</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    Share this link with {client?.name} to let them view their invoices:
                  </p>

                  {/* Link Display */}
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Portal Link:</p>
                    <p className="text-white text-sm break-all font-mono">{portalLink}</p>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={copyToClipboard}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
                  >
                    📋 Copy Link
                  </button>

                  {/* WhatsApp Share */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hi! Here's your invoice portal:\n\n${portalLink}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition block text-center"
                  >
                    💬 Share via WhatsApp
                  </a>

                  {/* Close Button */}
                  <button
                    onClick={() => setShowPortalModal(false)}
                    className="w-full glass px-4 py-2 rounded-lg text-gray-300 hover:text-gray-200 font-medium transition"
                  >
                    Close
                  </button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
