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
import { groupByCurrency } from '@/lib/currency-helper'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useCurrency } from '@/hooks/useCurrency'
import type { ClaudeInsights, InsightsResponse } from '@/app/api/insights/generate/route'

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
  currency_code?: string
}

export default function Dashboard() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useUserProfile()
  const { currencyCode } = useCurrency()
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
  const [overdueInvoices, setOverdueInvoices] = useState<Invoice[]>([])
  const [paidByCurrency, setPaidByCurrency] = useState<Record<string, number>>({})
  const [pendingByCurrency, setPendingByCurrency] = useState<Record<string, number>>({})
  const [insights, setInsights] = useState<ClaudeInsights | null>(null)
  const [insightsUsage, setInsightsUsage] = useState<{ used: number; limit: number; plan: string } | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [insightsGeneratedAt, setInsightsGeneratedAt] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [displayName, setDisplayName] = useState<string>('')

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          window.location.href = '/login'
          return
        }

        setUser(session.user)
        setToken(session.access_token)
        const userId = session.user.id

        // Fetch user's display name and insights from profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, business_name, latest_insights, insights_generated_at')
          .eq('id', userId)
          .single()

        if (profileData) {
          const name = profileData.full_name || profileData.business_name || session.user.email?.split('@')[0] || 'User'
          setDisplayName(name)
          
          // Load saved insights if they exist
          if (profileData.latest_insights) {
            setInsights(profileData.latest_insights)
            setInsightsGeneratedAt(profileData.insights_generated_at)
          }
        } else {
          setDisplayName(session.user.email?.split('@')[0] || 'User')
        }

        // Fetch clients count
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)

        // Fetch invoices with detailed data
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('amount, status, created_at, id, due_date, currency_code, amount_paid, remaining_balance')
          .eq('user_id', userId)

        // Fetch proposals count
        const { data: proposalsData } = await supabase
          .from('proposals')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)

        // Calculate comprehensive stats using amount_paid and remaining_balance
        const revenue = invoicesData?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
        
        // Paid revenue = SUM(amount_paid) across all invoices with payments
        const paidRevenue = invoicesData
          ?.filter(inv => (inv.amount_paid || 0) > 0)
          .reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0
        
        // Pending revenue = SUM(remaining_balance) for unpaid/partial invoices
        const pendingRevenue = invoicesData
          ?.filter(inv => (inv.remaining_balance || 0) > 0 && inv.status !== 'paid' && inv.status !== 'draft')
          .reduce((sum, inv) => sum + (inv.remaining_balance || 0), 0) || 0
        
        // Overdue amount = SUM(remaining_balance) for overdue invoices
        const now = new Date()
        const overdue = invoicesData?.filter(inv => {
          const isDue = inv.due_date && new Date(inv.due_date) < now
          const isUnpaid = inv.status !== 'paid' && inv.status !== 'draft'
          return isDue && isUnpaid
        }) || []
        const overdueAmount = overdue.reduce((sum, inv) => sum + (inv.remaining_balance || 0), 0)
        const overdueCount = overdue.length
        
        // Store overdue invoices for display with per-invoice currency
        setOverdueInvoices(overdue)

        // Calculate per-currency breakdowns using amount_paid for paid, remaining_balance for pending
        const paidInvoices = invoicesData?.filter(inv => (inv.amount_paid || 0) > 0) || []
        const pendingInvoices = invoicesData?.filter(inv => (inv.remaining_balance || 0) > 0 && inv.status !== 'paid' && inv.status !== 'draft') || []
        
        // For display, we need to adjust the grouping to use amount_paid/remaining_balance
        const paidByCurrencyMap: Record<string, number> = {}
        paidInvoices.forEach((inv: any) => {
          const code = inv.currency_code || 'MYR'
          paidByCurrencyMap[code] = (paidByCurrencyMap[code] || 0) + (inv.amount_paid || 0)
        })
        setPaidByCurrency(paidByCurrencyMap)

        const pendingByCurrencyMap: Record<string, number> = {}
        pendingInvoices.forEach((inv: any) => {
          const code = inv.currency_code || 'MYR'
          pendingByCurrencyMap[code] = (pendingByCurrencyMap[code] || 0) + (inv.remaining_balance || 0)
        })
        setPendingByCurrency(pendingByCurrencyMap)

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

        // Generate monthly revenue data (last 6 months) - using amount_paid for actual collected revenue
        const monthlyRevenue: { [key: string]: number } = {}
        const today = new Date()
        
        for (let i = 5; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          monthlyRevenue[monthKey] = 0
        }

        invoicesData?.forEach(inv => {
          if ((inv.amount_paid || 0) > 0) {
            const date = new Date(inv.created_at)
            const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            if (monthKey in monthlyRevenue) {
              monthlyRevenue[monthKey] += inv.amount_paid || 0
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

        // Invoice status breakdown - use amount_paid for paid, remaining_balance for unpaid
        const statusRevenue: { [key: string]: number } = {}
        invoicesData?.forEach(inv => {
          if (!(inv.status in statusRevenue)) {
            statusRevenue[inv.status] = 0
          }
          // For paid invoices, use amount_paid; for unpaid, use remaining_balance
          if (inv.status === 'paid') {
            statusRevenue[inv.status] += inv.amount_paid || 0
          } else if (inv.status !== 'draft') {
            statusRevenue[inv.status] += inv.remaining_balance || 0
          }
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
            description: `Invoice ${inv.status === 'paid' ? 'paid' : 'created'} - ${formatCurrency(inv.amount, inv.currency_code || currencyCode)}`,
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

  const generateInsights = async () => {
    if (!token) return

    setInsightsLoading(true)
    setInsightsError(null)

    try {
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          setInsightsError('Trial ended. Choose a plan to continue.')
        } else if (response.status === 429) {
          setInsightsError(`You've used all insights this month.`)
        } else {
          setInsightsError('Failed to generate insights')
        }
        return
      }

      const result = data as InsightsResponse
      setInsights(result.insights)
      setInsightsUsage(result.usage)
      setInsightsGeneratedAt(new Date().toISOString())
    } catch (err) {
      console.error('Insights error:', err)
      setInsightsError('An error occurred')
    } finally {
      setInsightsLoading(false)
    }
  }

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
            Welcome back, {displayName}! 👋
          </h1>
          <p className="text-gray-400 text-lg">Here's your business overview at a glance</p>
        </div>

        {/* Alert: Overdue Invoices */}
        {stats.overdueCount > 0 && (
          <Card className="mb-8 border-red-500/50 bg-red-500/10">
            <CardBody>
              <p className="text-red-300 font-semibold mb-4">⚠️ {stats.overdueCount} Overdue Invoice{stats.overdueCount !== 1 ? 's' : ''}</p>
              <div className="space-y-2 mb-4">
                {overdueInvoices.map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center">
                    <span className="text-red-300 text-sm">INV-{inv.id?.slice(0, 6)?.toUpperCase()}</span>
                    <span className="text-red-400 font-semibold">{formatCurrency(inv.amount, inv.currency_code || 'MYR')}</span>
                  </div>
                ))}
              </div>
              <Link href="/invoices">
                <Button className="bg-red-600/80 hover:bg-red-700/80 w-full">View Invoices</Button>
              </Link>
            </CardBody>
          </Card>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="hover:scale-105 hover:border-green-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Paid Revenue</div>
              <div className="space-y-2">
                {Object.entries(paidByCurrency).length > 0 ? (
                  Object.entries(paidByCurrency).map(([code, total]) => (
                    <div key={code} className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                      {formatCurrency(total, code)}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">No paid invoices</div>
                )}
              </div>
              <div className="text-green-400 text-sm mt-3">Invoices received</div>
            </CardBody>
          </Card>

          <Card className="hover:scale-105 hover:border-blue-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Pending Revenue</div>
              <div className="space-y-2">
                {Object.entries(pendingByCurrency).length > 0 ? (
                  Object.entries(pendingByCurrency).map(([code, total]) => (
                    <div key={code} className="text-2xl font-bold text-blue-400">
                      {formatCurrency(total, code)}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">No pending invoices</div>
                )}
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

        {/* AI Insights Widget */}
        <Card className="mb-10 border-blue-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                ✨ AI Insights
              </h2>
              <Button
                onClick={generateInsights}
                disabled={insightsLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-4 py-2 rounded disabled:opacity-50 text-sm"
              >
                {insightsLoading ? 'Analyzing...' : 'Generate'}
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {insightsError && (
              <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">{insightsError}</p>
              </div>
            )}

            {insightsLoading && (
              <div className="flex items-center justify-center gap-2 py-6">
                <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                <span className="text-gray-400 text-sm">Analyzing your data...</span>
              </div>
            )}

            {!insightsLoading && insights && (
              <>
                {insightsUsage && (
                  <div className="mb-4 text-xs text-gray-400">
                    <span className="text-white font-semibold">{insightsUsage.used}</span> of{' '}
                    <span className="text-white font-semibold">{insightsUsage.limit === 999999 ? '∞' : insightsUsage.limit}</span> used this month
                  </div>
                )}
                {insightsGeneratedAt && (
                  <div className="mb-4 text-xs text-gray-500">
                    Last updated: {new Date(insightsGeneratedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-gray-300 text-sm mb-3">{insights.summary}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Trend:</span>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        insights.revenue_trend === 'growing'
                          ? 'bg-green-500/20 text-green-400'
                          : insights.revenue_trend === 'stable'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {insights.revenue_trend === 'growing' && '📈 Growing'}
                      {insights.revenue_trend === 'stable' && '➡️ Stable'}
                      {insights.revenue_trend === 'declining' && '📉 Declining'}
                    </span>
                  </div>
                </div>

                {insights.highlights.slice(0, 2).length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-white mb-2">Top Highlights</h3>
                    <div className="space-y-2">
                      {insights.highlights.slice(0, 2).map((h, idx) => (
                        <div key={idx} className="flex gap-2 text-xs">
                          <span className="flex-shrink-0">{h.type === 'positive' ? '✓' : h.type === 'warning' ? '⚠️' : '→'}</span>
                          <span className="text-gray-400">{h.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link href="/insights">
                  <button className="text-blue-400 hover:text-blue-300 text-xs font-semibold">
                    View All Insights →
                  </button>
                </Link>
              </>
            )}

            {!insightsLoading && !insights && !insightsError && (
              <p className="text-gray-400 text-sm">Click "Generate" to get AI-powered insights about your business.</p>
            )}
          </CardBody>
        </Card>

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
                      formatter={(value: any) => formatCurrency(value, currencyCode)}
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
                      formatter={(value: any) => formatCurrency(value, currencyCode)}
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
                  {formatCurrency(stats.invoiceCount > 0 ? (stats.revenue / stats.invoiceCount) : 0, currencyCode)}
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
                <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.overdueAmount, currencyCode)}</p>
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
