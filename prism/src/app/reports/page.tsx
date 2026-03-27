'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Cell } from 'recharts'
import Link from 'next/link'

type ReportType = 'revenue' | 'aging' | 'client' | 'tax' | 'payments'

const REPORTS = [
  { id: 'revenue', name: 'Revenue Report', icon: '💰', desc: 'Monthly revenue breakdown', gated: false },
  { id: 'aging', name: 'Receivables Aging', icon: '⏰', desc: 'Aging analysis by client', gated: true },
  { id: 'client', name: 'By Client', icon: '👥', desc: 'Revenue per client', gated: true },
  { id: 'tax', name: 'Tax Report', icon: '🧾', desc: 'Income received summary', gated: true },
  { id: 'payments', name: 'Payments', icon: '📜', desc: 'Payment history log', gated: false },
]

const DATE_PRESETS = [
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
  { label: 'This quarter', value: 'this_quarter' },
  { label: 'Last quarter', value: 'last_quarter' },
  { label: 'This year', value: 'this_year' },
  { label: 'Last 6 months', value: 'last_6_months' },
]

interface SummaryMetrics {
  totalRevenue: number
  totalInvoiced: number
  collectionRate: number
  avgInvoiceSize: number
}

export default function ReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [plan, setPlan] = useState<string>('trial')
  const [selectedReport, setSelectedReport] = useState<ReportType>('revenue')
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)

  // Filters
  const [datePreset, setDatePreset] = useState('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedClient, setSelectedClient] = useState('all')
  const [clients, setClients] = useState<any[]>([])

  // Report data
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [tableData, setTableData] = useState<any[]>([])

  useEffect(() => {
    const initPage = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) {
          router.push('/login')
          return
        }

        setUser(userData.user)

        // Get user plan
        const { data: profileData } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', userData.user.id)
          .single()

        if (profileData?.plan) {
          setPlan(profileData.plan)
        }

        // Get clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', userData.user.id)
          .order('name')

        if (clientsData) {
          setClients(clientsData)
        }

        // Set default dates
        const now = new Date()
        setCustomTo(now.toISOString().split('T')[0])
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
        setCustomFrom(monthAgo.toISOString().split('T')[0])
      } catch (err) {
        console.error('[ReportsPage] Init error:', err)
      } finally {
        setLoading(false)
      }
    }

    initPage()
  }, [router])

  const getDateRange = () => {
    const now = new Date()
    let from = new Date()
    let to = new Date()

    switch (datePreset) {
      case 'this_month':
        from = new Date(now.getFullYear(), now.getMonth(), 1)
        to = now
        break
      case 'last_month':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        to = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        from = new Date(now.getFullYear(), quarter * 3, 1)
        to = now
        break
      case 'last_quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1
        from = new Date(now.getFullYear(), lastQuarter * 3, 1)
        to = new Date(now.getFullYear(), lastQuarter * 3 + 3, 0)
        break
      case 'this_year':
        from = new Date(now.getFullYear(), 0, 1)
        to = now
        break
      case 'last_6_months':
        from = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
        to = now
        break
    }

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    }
  }

  const handleGenerateReport = async () => {
    if (!user) return

    setReportLoading(true)
    try {
      const dateRange = getDateRange()
      const from = customFrom || dateRange.from
      const to = customTo || dateRange.to

      // Fetch invoices for the date range
      let query = supabase
        .from('invoices')
        .select('*, clients(id, name, email)')
        .eq('user_id', user.id)
        .gte('created_at', from)
        .lte('created_at', to)

      if (selectedClient !== 'all') {
        query = query.eq('client_id', selectedClient)
      }

      const { data: invoices, error } = await query

      if (error) {
        console.error('[ReportsPage] Query error:', error)
        return
      }

      // Process data based on selected report
      switch (selectedReport) {
        case 'revenue':
          processRevenueReport(invoices || [])
          break
        case 'aging':
          processAgingReport(invoices || [])
          break
        case 'client':
          processClientReport(invoices || [])
          break
        case 'tax':
          processTaxReport(invoices || [])
          break
        case 'payments':
          processPaymentReport(user.id)
          break
      }
    } catch (err) {
      console.error('[ReportsPage] Error:', err)
    } finally {
      setReportLoading(false)
    }
  }

  const processRevenueReport = (invoices: any[]) => {
    const byMonth: Record<string, any> = {}

    invoices.forEach((inv) => {
      const date = new Date(inv.created_at)
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          month: monthKey,
          invoiced: 0,
          collected: 0,
          count: 0,
          outstanding: 0,
        }
      }

      byMonth[monthKey].invoiced += inv.amount || 0
      byMonth[monthKey].collected += inv.amount_paid || 0
      byMonth[monthKey].outstanding += inv.remaining_balance || 0
      byMonth[monthKey].count++
    })

    const chartData = Object.values(byMonth)
    setChartData(chartData)
    setTableData(chartData)

    // Summary
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0
    const avgInvoiceSize = invoices.length > 0 ? totalInvoiced / invoices.length : 0

    setSummaryMetrics({
      totalRevenue: totalCollected,
      totalInvoiced,
      collectionRate,
      avgInvoiceSize,
    })
  }

  const processAgingReport = (invoices: any[]) => {
    // TODO: Implement aging report
    console.log('Aging report:', invoices)
  }

  const processClientReport = (invoices: any[]) => {
    // TODO: Implement client report
    console.log('Client report:', invoices)
  }

  const processTaxReport = (invoices: any[]) => {
    // TODO: Implement tax report
    console.log('Tax report:', invoices)
  }

  const processPaymentReport = async (userId: string) => {
    // TODO: Implement payment report
    console.log('Payment report for user:', userId)
  }

  const isReportGated = () => {
    const report = REPORTS.find((r) => r.id === selectedReport)
    return report?.gated && (plan === 'trial' || plan === 'starter')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6 flex justify-center items-center h-96">
          <div className="text-gray-400">Loading reports...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent mb-2">
            📊 Reports
          </h1>
          <p className="text-gray-400">Generate and export business reports</p>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
          {REPORTS.map((report) => {
            const isGated = report.gated && (plan === 'trial' || plan === 'starter')
            const isActive = selectedReport === report.id

            return (
              <button
                key={report.id}
                onClick={() => !isGated && setSelectedReport(report.id as ReportType)}
                disabled={isGated}
                className={`p-4 rounded-lg text-center transition ${
                  isActive ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-300'
                } ${isGated ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'} border`}
              >
                <div className="text-2xl mb-2">{report.icon}</div>
                <div className="font-semibold text-sm">{report.name}</div>
                {isGated && <div className="text-xs text-yellow-400 mt-1">Pro+</div>}
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <Card className="mb-8 border-blue-500/30">
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setDatePreset(preset.value)}
                  className={`px-3 py-2 rounded text-sm font-medium transition ${
                    datePreset === preset.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full glass px-3 py-2 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full glass px-3 py-2 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Client</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full glass px-3 py-2 rounded text-white text-sm appearance-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900">
                    All clients
                  </option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id} className="bg-slate-900">
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerateReport}
                disabled={reportLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {reportLoading ? '⏳ Generating...' : '📈 Generate Report'}
              </Button>
              <Button variant="outline">📥 Export PDF</Button>
              <Button variant="outline">📊 Export CSV</Button>
            </div>
          </CardBody>
        </Card>

        {/* Summary Metrics */}
        {summaryMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardBody>
                <p className="text-gray-400 text-sm mb-1">Total revenue</p>
                <p className="text-2xl font-bold text-green-400">MYR {summaryMetrics.totalRevenue.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">+3.5% vs last quarter</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-gray-400 text-sm mb-1">Total invoiced</p>
                <p className="text-2xl font-bold text-white">MYR {summaryMetrics.totalInvoiced.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">{tableData.length} invoices</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-gray-400 text-sm mb-1">Collection rate</p>
                <p className="text-2xl font-bold text-blue-400">{summaryMetrics.collectionRate.toFixed(0)}%</p>
                <p className="text-xs text-gray-500 mt-1">3% vs last quarter</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-gray-400 text-sm mb-1">Avg invoice size</p>
                <p className="text-2xl font-bold text-purple-400">MYR {summaryMetrics.avgInvoiceSize.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">+7% vs last quarter</p>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Report Content */}
        {isReportGated() ? (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardBody className="text-center py-12">
              <p className="text-xl font-semibold text-white mb-4">
                {REPORTS.find((r) => r.id === selectedReport)?.name} is a Pro feature
              </p>
              <p className="text-gray-400 mb-6">Upgrade to access advanced reporting and analytics.</p>
              <Link href="/pricing">
                <Button className="bg-blue-600 hover:bg-blue-700">Upgrade to Pro</Button>
              </Link>
            </CardBody>
          </Card>
        ) : chartData.length > 0 ? (
          <Card className="border-blue-500/30">
            <CardBody className="space-y-8">
              {/* Chart */}
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" stroke="#999" />
                    <YAxis stroke="#999" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="invoiced" fill="#3b82f6" />
                    <Bar dataKey="collected" fill="#10b981" />
                    <Bar dataKey="outstanding" fill="#f59e0b" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400">Month</th>
                      <th className="text-right py-3 px-4 text-gray-400">Invoiced</th>
                      <th className="text-right py-3 px-4 text-gray-400">Collected</th>
                      <th className="text-right py-3 px-4 text-gray-400">Outstanding</th>
                      <th className="text-right py-3 px-4 text-gray-400">Invoices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white">{row.month}</td>
                        <td className="text-right py-3 px-4 text-white">MYR {row.invoiced.toFixed(0)}</td>
                        <td className="text-right py-3 px-4 text-green-400">MYR {row.collected.toFixed(0)}</td>
                        <td className="text-right py-3 px-4 text-yellow-400">MYR {row.outstanding.toFixed(0)}</td>
                        <td className="text-right py-3 px-4 text-gray-300">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card className="border-gray-700">
            <CardBody className="text-center py-12">
              <p className="text-gray-400 text-lg">No data found for this period</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or date range</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}
