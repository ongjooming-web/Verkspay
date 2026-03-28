'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { formatCurrency } from '@/lib/countries'

interface Proposal {
  id: string
  proposal_number: string
  title: string
  client_id: string
  client_name?: string
  total_amount: number
  currency_code: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined'
  created_at: string
}

export default function ProposalsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) {
          router.push('/login')
          return
        }

        setUser(userData.user)
        const userId = userData.user.id

        // Fetch proposals with client names
        const { data: proposalsData, error } = await supabase
          .from('proposals')
          .select(`
            id,
            proposal_number,
            title,
            client_id,
            total_amount,
            currency_code,
            status,
            created_at,
            clients (name)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('[Proposals] Error fetching:', error)
        } else if (proposalsData) {
          const formatted = proposalsData.map((p: any) => ({
            ...p,
            client_name: p.clients?.name || 'Unknown Client'
          }))
          setProposals(formatted)
        }
      } catch (err) {
        console.error('[Proposals] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProposals()
  }, [router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500/20 border-gray-400/30 text-gray-300'
      case 'sent':
        return 'bg-blue-500/20 border-blue-400/30 text-blue-300'
      case 'viewed':
        return 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300'
      case 'accepted':
        return 'bg-green-500/20 border-green-400/30 text-green-300'
      case 'declined':
        return 'bg-red-500/20 border-red-400/30 text-red-300'
      default:
        return 'bg-gray-500/20 text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return '📝'
      case 'sent':
        return '📤'
      case 'viewed':
        return '👁️'
      case 'accepted':
        return '✅'
      case 'declined':
        return '❌'
      default:
        return '•'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative z-10">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6 flex justify-center items-center h-96">
          <div className="text-gray-400">Loading proposals...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />

      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold text-white">📋 Proposals</h1>
          <Link href="/proposals/new">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg">
              + Create Proposal
            </Button>
          </Link>
        </div>

        {/* Empty State */}
        {proposals.length === 0 ? (
          <Card className="border-blue-500/30">
            <CardBody>
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📋</div>
                <h2 className="text-xl font-semibold text-white mb-2">No proposals yet</h2>
                <p className="text-gray-400 mb-6">Create your first proposal to win new clients</p>
                <Link href="/proposals/new">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
                    Create Proposal
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card className="border-blue-500/30">
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Number</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Title</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Client</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">Amount</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Created</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map((proposal) => (
                      <tr
                        key={proposal.id}
                        className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer"
                        onClick={() => router.push(`/proposals/${proposal.id}`)}
                      >
                        <td className="py-3 px-4 text-white font-mono text-sm">{proposal.proposal_number}</td>
                        <td className="py-3 px-4 text-white">{proposal.title}</td>
                        <td className="py-3 px-4 text-gray-300">{proposal.client_name}</td>
                        <td className="py-3 px-4 text-right text-white font-semibold">
                          {formatCurrency(proposal.total_amount, proposal.currency_code)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(proposal.status)}`}>
                            {getStatusIcon(proposal.status)} {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-sm">
                          {new Date(proposal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link href={`/proposals/${proposal.id}`} onClick={(e) => e.stopPropagation()}>
                            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">View →</button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}
