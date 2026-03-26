'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { formatCurrency } from '@/lib/countries'
import { generateInvoiceNumber } from '@/utils/invoice-numbering'

interface LineItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

interface Proposal {
  id: string
  proposal_number: string
  title: string
  client_id: string
  client_name?: string
  total_amount: number
  currency_code: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined'
  summary?: string
  scope_of_work?: string
  deliverables?: string
  timeline?: string
  line_items?: LineItem[]
  valid_until?: string
  payment_terms?: string
  terms_and_conditions?: string
  sent_at?: string
  created_at: string
}

export default function ProposalDetail() {
  const router = useRouter()
  const params = useParams()
  const proposalId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) {
          router.push('/login')
          return
        }

        setUser(userData.user)

        // Fetch proposal
        const { data: proposalData, error } = await supabase
          .from('proposals')
          .select(`
            *,
            clients (name)
          `)
          .eq('id', proposalId)
          .eq('user_id', userData.user.id)
          .single()

        if (error || !proposalData) {
          console.error('[ProposalDetail] Not found:', error)
          router.push('/proposals')
          return
        }

        setProposal({
          ...proposalData,
          client_name: proposalData.clients?.name || 'Unknown'
        })
      } catch (err) {
        console.error('[ProposalDetail] Error:', err)
        router.push('/proposals')
      } finally {
        setLoading(false)
      }
    }

    fetchProposal()
  }, [proposalId, router])

  const handleConvertToInvoice = async () => {
    if (!proposal || !user) return

    setConverting(true)
    setMessage('')

    try {
      // Generate invoice number
      let invoiceNumber: string
      try {
        invoiceNumber = await generateInvoiceNumber(user.id, supabase)
      } catch (err) {
        setMessage('❌ Failed to generate invoice number')
        setConverting(false)
        return
      }

      // Create invoice from proposal
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert([
          {
            user_id: user.id,
            invoice_number: invoiceNumber,
            client_id: proposal.client_id,
            amount: proposal.total_amount,
            currency_code: proposal.currency_code,
            status: 'unpaid',
            description: `Invoice for: ${proposal.title}`,
            payment_terms: proposal.payment_terms || 'Net 30',
            line_items: proposal.line_items || [],
            due_date: proposal.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          }
        ])
        .select()

      if (invoiceError) {
        console.error('[ConvertToInvoice] Error:', invoiceError)
        setMessage('❌ Failed to create invoice')
        setConverting(false)
        return
      }

      if (invoiceData && invoiceData[0]) {
        // Update proposal status to accepted if it was sent
        if (proposal.status === 'sent' || proposal.status === 'viewed') {
          await supabase
            .from('proposals')
            .update({ 
              status: 'accepted',
              accepted_at: new Date().toISOString()
            })
            .eq('id', proposal.id)
        }

        setMessage('✅ Invoice created from proposal!')
        setTimeout(() => {
          router.push(`/invoices`)
        }, 1500)
      }
    } catch (err) {
      console.error('[ConvertToInvoice] Error:', err)
      setMessage('❌ An error occurred')
      setConverting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500/20 text-gray-300'
      case 'sent':
        return 'bg-blue-500/20 text-blue-300'
      case 'viewed':
        return 'bg-yellow-500/20 text-yellow-300'
      case 'accepted':
        return 'bg-green-500/20 text-green-300'
      case 'declined':
        return 'bg-red-500/20 text-red-300'
      default:
        return 'bg-gray-500/20 text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-4xl mx-auto p-6 flex justify-center items-center h-96">
          <div className="text-gray-400">Loading proposal...</div>
        </div>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardBody>
              <p className="text-gray-400">Proposal not found</p>
              <Link href="/proposals">
                <Button className="mt-4 bg-blue-600">Back to Proposals</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-4xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{proposal.title}</h1>
            <p className="text-gray-400">
              {proposal.proposal_number} • {proposal.client_name}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(proposal.status)}`}>
            {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
          </span>
        </div>

        {message && (
          <Card className={`mb-6 border-${message.includes('✅') ? 'green' : 'red'}-500/30`}>
            <CardBody>
              <p className={message.includes('✅') ? 'text-green-300' : 'text-red-300'}>{message}</p>
            </CardBody>
          </Card>
        )}

        {/* Main Content */}
        <Card className="mb-6 border-blue-500/30">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">Proposal Details</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            {proposal.summary && (
              <div>
                <h3 className="text-white font-semibold mb-2">Summary</h3>
                <p className="text-gray-300">{proposal.summary}</p>
              </div>
            )}

            {proposal.scope_of_work && (
              <div>
                <h3 className="text-white font-semibold mb-2">Scope of Work</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{proposal.scope_of_work}</p>
              </div>
            )}

            {proposal.deliverables && (
              <div>
                <h3 className="text-white font-semibold mb-2">Deliverables</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{proposal.deliverables}</p>
              </div>
            )}

            {proposal.timeline && (
              <div>
                <h3 className="text-white font-semibold mb-2">Timeline</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{proposal.timeline}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Line Items */}
        {proposal.line_items && proposal.line_items.length > 0 && (
          <Card className="mb-6 border-blue-500/30">
            <CardHeader>
              <h2 className="text-2xl font-bold text-white">Line Items</h2>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-4 text-gray-400 text-sm">Description</th>
                      <th className="text-right py-2 px-4 text-gray-400 text-sm">Qty</th>
                      <th className="text-right py-2 px-4 text-gray-400 text-sm">Rate</th>
                      <th className="text-right py-2 px-4 text-gray-400 text-sm">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.line_items.map((item, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="py-2 px-4 text-white">{item.description}</td>
                        <td className="text-right py-2 px-4 text-gray-300">{item.quantity}</td>
                        <td className="text-right py-2 px-4 text-gray-300">
                          {formatCurrency(item.rate, proposal.currency_code)}
                        </td>
                        <td className="text-right py-2 px-4 text-white font-semibold">
                          {formatCurrency(item.amount, proposal.currency_code)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-right border-t border-white/10 pt-4">
                <p className="text-lg font-bold text-white">
                  Total: {formatCurrency(proposal.total_amount, proposal.currency_code)}
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Terms */}
        {(proposal.valid_until || proposal.payment_terms || proposal.terms_and_conditions) && (
          <Card className="mb-6 border-blue-500/30">
            <CardHeader>
              <h2 className="text-2xl font-bold text-white">Terms</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {proposal.valid_until && (
                <div>
                  <h3 className="text-white font-semibold mb-1">Valid Until</h3>
                  <p className="text-gray-300">
                    {new Date(proposal.valid_until).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {proposal.payment_terms && (
                <div>
                  <h3 className="text-white font-semibold mb-1">Payment Terms</h3>
                  <p className="text-gray-300">{proposal.payment_terms}</p>
                </div>
              )}
              {proposal.terms_and_conditions && (
                <div>
                  <h3 className="text-white font-semibold mb-1">Terms & Conditions</h3>
                  <p className="text-gray-300 whitespace-pre-wrap text-sm">{proposal.terms_and_conditions}</p>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Actions */}
        <Card className="border-blue-500/30">
          <CardBody className="flex gap-3 flex-wrap">
            <Link href={`/proposals/${proposal.id}/edit`}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">✏️ Edit</Button>
            </Link>
            {proposal.status === 'accepted' && (
              <Button
                onClick={handleConvertToInvoice}
                disabled={converting}
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                {converting ? 'Creating...' : '📄 Convert to Invoice'}
              </Button>
            )}
            {proposal.status !== 'accepted' && proposal.status !== 'declined' && (
              <Button
                onClick={handleConvertToInvoice}
                disabled={converting}
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                {converting ? 'Converting...' : '📄 Convert to Invoice'}
              </Button>
            )}
            <Link href="/proposals">
              <Button className="bg-gray-600 hover:bg-gray-700 text-white">← Back</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
