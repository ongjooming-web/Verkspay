'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/countries'
import { useUserProfile } from '@/hooks/useUserProfile'

interface RecentActivity {
  id: string
  type: string
  description: string
  timestamp: string
}

interface Invoice {
  id: string
  amount: number
  status: string
  created_at: string
  due_date: string
}

export default function Dashboard() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useUserProfile()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    revenue: 0,
    paidRevenue: 0,
    pendingRevenue: 0,
    clientCount: 0,
    invoiceCount: 0,
    proposalCount: 0,
    overdueCount: 0,
    overdueAmount: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [pipelineData, setPipelineData] = useState<any[]>([])
  const [invoicesByStatus, setInvoicesByStatus] = useState<any[]>([])

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (!authUser) {
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

        // Fetch invoices with detailed data
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('amount, status, created_at, id, due_date')
          .eq('user_id', userId)

        // Fetch proposals count
        const { data: proposalsData } = await supabase
          .from('proposals')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)

        // Calculate comprehensive stats
        const revenue = invoicesData?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
        const paidRevenue = invoicesData
          ?.filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
        const pendingRevenue = invoicesData
          ?.filter(inv => inv.status !== 'paid')
          .reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
        
        const now = new Date()
        const overdue = invoicesData?.filter(inv => 
          inv.status !== 'paid' && new Date(inv.due_date) < now
        ) || []
        const overdueAmount = overdue.reduce((sum, inv) => sum + (inv.amount || 0), 0)
        const overdueCount = overdue.length

        const clientCount = clientsData?.length || 0
        const invoiceCount = invoicesData?.length || 0
        const proposalCount = proposalsData?.length || 0

        setStats({
          revenue,
          paidRevenue,
          pendingRevenue,
          clientCount,
          invoiceCount,
          proposalCount,
          overdueCount,
          overdueAmount,
        })

        // Generate monthly revenue data (last 6 months)
        const monthlyRevenue: { [key: string]: number } = {}
        const today = new Date()
        
        for (let i = 5; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          monthlyRevenue[monthKey] = 0
        }

        invoicesData?.forEach(inv => {
          if (inv.status === 'paid') {
            const date = new Date(inv.created_at)
            const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            if (monthKey in monthlyRevenue) {
              monthlyRevenue[monthKey] += inv.amount
            }
          }
        })

        setMonthlyData(Object.entries(monthlyRevenue).map(([month, revenue]) => ({
          month,
          revenue
        })))

        // Pipeline breakdown
        const statusCounts = {
          draft: 0,
          sent: 0,
          paid: 0,
          overdue: 0
        }
        
        invoicesData?.forEach(inv => {
          if (inv.status in statusCounts) {
            statusCounts[inv.status as keyof typeof statusCounts]++
          }
        })

        setPipelineData([
          { name: 'Draft', value: statusCounts.draft, color: '#8B8B8B' },
          { name: 'Sent', value: statusCounts.sent, color: '#4D96FF' },
          { name: 'Paid', value: statusCounts.paid, color: '#6BDB77' },
          { name: 'Overdue', value: statusCounts.overdue, color: '#FF6B6B' }
        ])

        // Invoice status breakdown
        const statusRevenue: { [key: string]: number } = {}
        invoicesData?.forEach(inv => {
          if (!(inv.status in statusRevenue)) {
            statusRevenue[inv.status] = 0
          }
          statusRevenue[inv.status] += inv.amount
        })

        setInvoicesByStatus(
          Object.entries(statusRevenue).map(([status, amount]) => ({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: amount,
            color: status === 'paid' ? '#6BDB77' : status === 'overdue' ? '#FF6B6B' : '#4D96FF'
          }))
        )

        // Build recent activity from all sources
        const activities: RecentActivity[] = []

        invoicesData?.slice(0, 3).forEach((inv) => {
          activities.push({
            id: `inv-${inv.id}`,
            type: 'invoice',
            description: `Invoice ${inv.status === 'paid' ? 'paid' : 'created'} - ${formatCurrency(inv.amount, profile?.currency_code || 'MYR')}`,
            timestamp: inv.created_at,
          })
        })

        proposalsData?.slice(0, 2).forEach((prop: any) => {
          activities.push({
            id: `prop-${prop.id}`,
            type: 'proposal',
            description: `Proposal created`,
            timestamp: prop.created_at,
          })
        })

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

        {/* Alert: Overdue Invoices */}
        {stats.overdueCount > 0 && (
          <Card className="mb-8 border-red-500/50 bg-red-500/10">
            <CardBody className="flex justify-between items-center">
              <div>
                <p className="text-red-300 font-semibold">⚠️ {stats.overdueCount} Overdue Invoice{stats.overdueCount !== 1 ? 's' : ''}</p>
                <p className="text-red-400 text-sm">{formatCurrency(stats.overdueAmount, profile?.currency_code || 'MYR')} past due</p>
              </div>
              <Link href="/invoices">
                <Button className="bg-red-600/80 hover:bg-red-700/80">View Invoices</Button>
              </Link>
            </CardBody>
          </Card>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="hover:scale-105 hover:border-green-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Paid Revenue</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {formatCurrency(stats.paidRevenue, profile?.currency_code || 'MYR')}
              </div>
              <div className="text-green-400 text-sm mt-3">Invoices received</div>
            </CardBody>
          </Card>

          <Card className="hover:scale-105 hover:border-blue-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Pending Revenue</div>
              <div className="text-4xl font-bold text-blue-400">
                {formatCurrency(stats.pendingRevenue, profile?.currency_code || 'MYR')}
              </div>
              <div className="text-blue-300 text-sm mt-3">Awaiting payment</div>
            </CardBody>
          </Card>

          <Card className="hover:scale-105 hover:border-purple-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Active Clients</div>
              <div className="text-4xl font-bold text-purple-400">{stats.clientCount}</div>
              <div className="text-purple-400 text-sm mt-3">In your network</div>
            </CardBody>
          </Card>

          <Card className="hover:scale-105 hover:border-yellow-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Total Invoices</div>
              <div className="text-4xl font-bold text-yellow-400">{stats.invoiceCount}</div>
              <div className="text-orange-400 text-sm mt-3">{stats.proposalCount} proposals</div>
            </CardBody>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Revenue Chart */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📈</span> Monthly Revenue (Last 6 Months)
              </h2>
            </CardHeader>
            <CardBody>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(15, 15, 15, 0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: any) => `$${value.toFixed(0)}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="url(#colorRevenue)" 
                      strokeWidth={3}
                      dot={{ fill: '#667eea', r: 5 }}
                    />
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Pipeline Breakdown */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🎯</span> Invoice Status Distribution
              </h2>
            </CardHeader>
            <CardBody>
              <div className="h-80 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pipelineData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(15, 15, 15, 0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue by Status */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>💰</span> Revenue by Status
              </h2>
            </CardHeader>
            <CardBody>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={invoicesByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(15, 15, 15, 0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: any) => `$${value.toFixed(0)}`}
                    />
                    <Bar dataKey="value" fill="#667eea">
                      {invoicesByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-white">📊 Quick Stats</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Average Invoice</p>
                <p className="text-2xl font-bold text-blue-400">
                  ${stats.invoiceCount > 0 ? (stats.revenue / stats.invoiceCount).toFixed(0) : 0}
                </p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="text-gray-400 text-sm mb-1">Collection Rate</p>
                <p className="text-2xl font-bold text-green-400">
                  {stats.revenue > 0 ? ((stats.paidRevenue / stats.revenue) * 100).toFixed(0) : 0}%
                </p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <p className="text-gray-400 text-sm mb-1">Overdue</p>
                <p className="text-2xl font-bold text-red-400">${stats.overdueAmount.toFixed(0)}</p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Quick Actions & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <h2 className="text-xl font-bold text-white">⚡ Quick Actions</h2>
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

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-center text-xs text-gray-500">
          <div className="flex justify-center gap-6 mb-4">
            <Link href="/privacy" className="hover:text-gray-400 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-400 transition">Terms of Service</Link>
            <a href="mailto:support@prismops.xyz" className="hover:text-gray-400 transition">Contact</a>
          </div>
          <p>© 2026 Prism</p>
        </footer>
      </div>
    </div>
  )
}
