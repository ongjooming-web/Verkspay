'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'

interface RecentActivity {
  id: string
  type: string
  description: string
  timestamp: string
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    revenue: 0,
    clientCount: 0,
    invoiceCount: 0,
    proposalCount: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Get authenticated user (middleware already verified this)
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (!authUser) {
          // Fallback: middleware should have caught this
          window.location.href = '/login'
          return
        }

        setUser(authUser)
        const userId = authUser.id

        // Fetch clients count
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)

        // Fetch invoices with revenue sum
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('amount, status, created_at, id')
          .eq('user_id', userId)

        // Fetch proposals count
        const { data: proposalsData } = await supabase
          .from('proposals')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)

        // Calculate stats
        const revenue = invoicesData?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
        const clientCount = clientsData?.length || 0
        const invoiceCount = invoicesData?.length || 0
        const proposalCount = proposalsData?.length || 0

        setStats({
          revenue,
          clientCount,
          invoiceCount,
          proposalCount,
        })

        // Build recent activity from all sources
        const activities: RecentActivity[] = []

        // Add recent invoices
        invoicesData?.slice(0, 3).forEach((inv) => {
          activities.push({
            id: `inv-${inv.id}`,
            type: 'invoice',
            description: `Invoice created - $${inv.amount.toFixed(2)}`,
            timestamp: inv.created_at,
          })
        })

        // Add recent proposals
        proposalsData?.slice(0, 2).forEach((prop: any) => {
          activities.push({
            id: `prop-${prop.id}`,
            type: 'proposal',
            description: `Proposal created`,
            timestamp: prop.created_at,
          })
        })

        // Sort by timestamp (most recent first)
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        setRecentActivity(activities.slice(0, 5))
        setLoading(false)
      } catch (err) {
        console.error('Dashboard error:', err)
        setError('Failed to load dashboard')
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen relative z-10">
        <div className="glass px-8 py-6 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-gray-300">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen relative z-10">
        <div className="glass px-8 py-6 rounded-lg">
          <div className="text-center">
            <p className="text-red-300 mb-4">Not authenticated</p>
            <Button onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const getTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {error && (
          <div className="mb-6 glass border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent mb-3">
            Welcome back, {user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-gray-400 text-lg">Here's your business overview at a glance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="hover:scale-105 hover:border-blue-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Total Revenue</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-blue-300 text-sm mt-3">From {stats.invoiceCount} invoices</div>
            </CardBody>
          </Card>

          <Card className="hover:scale-105 hover:border-green-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Active Clients</div>
              <div className="text-4xl font-bold text-green-400">{stats.clientCount}</div>
              <div className="text-green-500 text-sm mt-3">Total clients in your network</div>
            </CardBody>
          </Card>

          <Card className="hover:scale-105 hover:border-yellow-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Invoices</div>
              <div className="text-4xl font-bold text-yellow-400">{stats.invoiceCount}</div>
              <div className="text-orange-400 text-sm mt-3">Total invoices created</div>
            </CardBody>
          </Card>

          <Card className="hover:scale-105 hover:border-purple-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Proposals</div>
              <div className="text-4xl font-bold text-purple-400">{stats.proposalCount}</div>
              <div className="text-purple-400 text-sm mt-3">Active proposals</div>
            </CardBody>
          </Card>
        </div>

        {/* Quick Actions & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <h2 className="text-xl font-bold text-white">Quick Actions</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <Link href="/clients" className="block">
                <Button variant="outline" className="w-full justify-start hover:translate-x-1">
                  <span className="mr-2">👥</span> Add New Client
                </Button>
              </Link>
              <Link href="/invoices" className="block">
                <Button variant="outline" className="w-full justify-start hover:translate-x-1">
                  <span className="mr-2">📄</span> Create Invoice
                </Button>
              </Link>
              <Link href="/proposals" className="block">
                <Button variant="outline" className="w-full justify-start hover:translate-x-1">
                  <span className="mr-2">📝</span> Send Proposal
                </Button>
              </Link>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📊</span> Recent Activity
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  <p>No activity yet. Create your first client, invoice, or proposal!</p>
                </div>
              ) : (
                recentActivity.map((activity, idx) => (
                  <div key={activity.id} className={`py-3 ${idx < recentActivity.length - 1 ? 'border-b border-white/10' : ''} hover:bg-white/5 rounded px-2 transition-colors`}>
                    <div className="font-medium text-white flex items-center gap-2">
                      <span className="text-lg">{activity.type === 'invoice' ? '📄' : '📝'}</span>
                      {activity.description}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">{getTimeAgo(activity.timestamp)}</div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
