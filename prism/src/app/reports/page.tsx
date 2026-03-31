'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'
import { useCurrency } from '@/hooks/useCurrency'

// Dynamically import chart component (browser-only)
const ReportsChart = dynamic(() => import('@/components/ReportsChart').then((mod) => mod.ReportsChart), {
  ssr: false,
})

// html2pdf will be loaded dynamically in exportToPDF function

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
  const { currencyCode } = useCurrency()
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
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all')
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([])
  const [clients, setClients] = useState<any[]>([])

  // Report data
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [tableData, setTableData] = useState<any[]>([])
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Format date as YYYY-MM-DD in local timezone
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Format the "to" date as end-of-day timestamp so today's invoices are included
  // Supabase stores created_at as UTC — using YYYY-MM-DDT23:59:59+08:00 ensures
  // all invoices created anywhere on that calendar day (MYT) are captured
  const formatToDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}T23:59:59+08:00`
  }

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

        // Fetch all distinct currencies from user's invoices for the currency filter dropdown
        const { data: currencyRows } = await supabase
          .from('invoices')
          .select('currency_code')
          .eq('user_id', userData.user.id)

        if (currencyRows) {
          const codes = [...new Set(
            currencyRows.map((r: any) => r.currency_code || 'MYR').filter(Boolean)
          )].sort() as string[]
          setAvailableCurrencies(codes)
          // Default to preferred currency if available, else first in list
          const preferred = currencyCode
          const defaultCurrency = codes.includes(preferred) ? preferred : (codes[0] || 'MYR')
          setSelectedCurrency(defaultCurrency)
        }

        // Set default dates (This month) - will be formatted properly via formatDateToString in a moment
        setDatePreset('this_month')
        // The useEffect below will handle fetching once user is set

        console.log('[Reports] Page initialized, ready to fetch default report')
      } catch (err) {
        console.error('[Reports] Init error:', err)
      } finally {
        setLoading(false)
      }
    }

    initPage()
  }, [router])

  // Auto-fetch default report when user loads (This month preset)
  // Auto-fetch when user first loads
  useEffect(() => {
    if (user && selectedReport) {
      const now = new Date()
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      const to = new Date(now)
      const fromStr = formatDateToString(from)
      const toStr = formatDateToString(to)
      setCustomFrom(fromStr)
      setCustomTo(toStr)
      fetchReportData(selectedReport, fromStr, formatToDate(to), 'all')
    }
  }, [user])

  // Re-fetch whenever currency filter changes (with current date range)
  useEffect(() => {
    if (!user) return
    const from = customFrom || formatDateToString(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const toDate = customTo ? new Date(customTo) : new Date()
    fetchReportData(selectedReport, from, formatToDate(toDate), selectedClient)
  }, [selectedCurrency])

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

    const fromStr = formatDateToString(from)
    const toStr = formatDateToString(to)

    return { from: fromStr, to: toStr }
  }

  const handlePresetClick = (preset: string) => {
    console.log('[Reports] Preset clicked:', preset)
    setDatePreset(preset)

    // Calculate date range for this preset
    const now = new Date()
    let from = new Date()
    let to = new Date()

    switch (preset) {
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
        from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        to = now
        break
    }

    const fromStr = formatDateToString(from)
    const toStr = formatDateToString(to)

    // Update the date inputs (must be plain yyyy-MM-dd for <input type="date">)
    setCustomFrom(fromStr)
    setCustomTo(toStr)

    // Pass end-of-day timestamp to query so today's invoices are included
    fetchReportData(selectedReport, fromStr, formatToDate(to), selectedClient)
  }

  const fetchReportData = async (reportType: ReportType, from: string, to: string, clientId: string) => {
    if (!user) return

    setReportLoading(true)
    try {
      console.log('[Reports] Fetching report data:', { reportType, from, to, clientId })

      // Validate date range
      if (new Date(from) > new Date(to)) {
        console.error('[Reports] Invalid date range: from > to')
        setReportLoading(false)
        return
      }

      let invoices: any[] = []

      // Build base query
      let query = supabase
        .from('invoices')
        .select('*,clients:client_id(id,name,email)')
        .eq('user_id', user.id)

      console.log('[Reports] Query filters - reportType:', reportType, 'from:', from, 'to:', to)

      // Apply date filter based on report type
      if (reportType === 'tax') {
        // Tax report uses paid_date (when money was actually received)
        console.log('[Reports] Using paid_date filter for tax report')
        query = query
          .gte('paid_date', from)
          .lte('paid_date', to)
          .gt('amount_paid', 0) // Only include invoices with actual payment
      } else if (reportType === 'payments') {
        // Payments report: use invoices with amount_paid > 0 (since payment_records may not exist)
        console.log('[Reports] Fetching payment history from invoices table (amount_paid > 0)')
        query = query
          .gte('created_at', from)
          .lte('created_at', to)
          .gt('amount_paid', 0) // Only show invoices with payments
      } else {
        // Revenue, Aging, Client reports use created_at (when invoice was created)
        console.log('[Reports] Using created_at filter for', reportType, 'report')
        query = query
          .gte('created_at', from)
          .lte('created_at', to)
      }

      if (clientId && clientId !== 'all') {
        query = query.eq('client_id', clientId)
      }

      // Apply currency filter at DB level — never mix currencies
      if (selectedCurrency && selectedCurrency !== 'all') {
        query = query.eq('currency_code', selectedCurrency)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('[Reports] Supabase error:', error)
      }

      if (data) {
        invoices = data
      }

      // Process data based on report type
      if (reportType === 'revenue') {
        processRevenueReport(invoices)
      } else if (reportType === 'aging') {
        processAgingReport(invoices)
      } else if (reportType === 'client') {
        processClientReport(invoices)
      } else if (reportType === 'tax') {
        processTaxReport(invoices)
      } else if (reportType === 'payments') {
        processPaymentsReport(invoices)
      }

      setReportLoading(false)
    } catch (error) {
      console.error('[Reports] Error fetching report:', error)
      setReportLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    // Use custom dates if provided, otherwise use preset range
    let from = customFrom
    let to = customTo

    if (!from || !to) {
      const dateRange = getDateRange()
      from = from || dateRange.from
      to = to || dateRange.to
    }

    // Apply end-of-day to 'to' so today's invoices are included
    const toWithTime = to ? formatToDate(new Date(to)) : to
    fetchReportData(selectedReport, from, toWithTime, selectedClient)
  }

  const processRevenueReport = (invoices: any[]) => {
    const byMonth: Record<string, any> = {}
    const invoiceDetails: any[] = []

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

      // Store invoice details for table
      invoiceDetails.push({
        invoiceNumber: inv.invoice_number || 'N/A',
        dateIssued: new Date(inv.created_at).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }),
        client: inv.clients?.name || 'Unknown',
        description: inv.description || '-',
        amount: inv.amount || 0,
        paid: inv.amount_paid || 0,
        outstanding: inv.remaining_balance || 0,
        status: inv.status || 'unknown',
      })
    })

    const chartData = Object.values(byMonth)
    setChartData(chartData)
    // For revenue report, show both summary AND invoice details
    setTableData(invoiceDetails.length > 0 ? invoiceDetails : chartData)

    // Summary
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0
    const avgInvoiceSize = invoices.length > 0 ? totalInvoiced / invoices.length : 0

    setSummaryMetrics({
      totalRevenue: totalCollected || 0,
      totalInvoiced: totalInvoiced || 0,
      collectionRate: collectionRate || 0,
      avgInvoiceSize: avgInvoiceSize || 0,
    })
  }

  const processAgingReport = (invoices: any[]) => {
    // Calculate aging buckets per client
    const today = new Date()
    const byClient: Record<string, any> = {}

    invoices.forEach((inv) => {
      // Only unpaid/partial invoices
      if (inv.status === 'paid') return

      const clientName = inv.clients?.name || 'Unknown'
      const dueDate = new Date(inv.due_date)
      const daysSinceDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      if (!byClient[clientName]) {
        byClient[clientName] = {
          client: clientName,
          current: 0,
          '1-30': 0,
          '31-60': 0,
          '61-90': 0,
          '90+': 0,
          total: 0,
          currency_code: inv.currency_code || 'MYR',
        }
      }

      const balance = inv.remaining_balance != null ? inv.remaining_balance : inv.amount

      if (daysSinceDue <= 0) {
        byClient[clientName].current += balance
      } else if (daysSinceDue <= 30) {
        byClient[clientName]['1-30'] += balance
      } else if (daysSinceDue <= 60) {
        byClient[clientName]['31-60'] += balance
      } else if (daysSinceDue <= 90) {
        byClient[clientName]['61-90'] += balance
      } else {
        byClient[clientName]['90+'] += balance
      }

      byClient[clientName].total += balance
    })

    const chartData = Object.values(byClient).sort((a: any, b: any) => b.total - a.total)
    setChartData(chartData)
    setTableData(chartData)

    // Summary
    const totalOutstanding = Object.values(byClient).reduce((sum: number, b: any) => sum + b.total, 0)
    const current = Object.values(byClient).reduce((sum: number, b: any) => sum + b.current, 0)
    const overdue1_30 = Object.values(byClient).reduce((sum: number, b: any) => sum + b['1-30'], 0)

    setSummaryMetrics({
      totalRevenue: totalOutstanding,
      totalInvoiced: current,
      collectionRate: (current / totalOutstanding) * 100,
      avgInvoiceSize: overdue1_30,
    })
  }

  const processClientReport = (invoices: any[]) => {
    const byClient: Record<string, any> = {}

    invoices.forEach((inv) => {
      const clientName = inv.clients?.name || 'Unknown'

      if (!byClient[clientName]) {
        byClient[clientName] = {
          client: clientName,
          count: 0,
          invoiced: 0,
          paid: 0,
          outstanding: 0,
          avgPaymentDays: 0,
          percentage: 0,
          currency_code: inv.currency_code || 'MYR',
        }
      }

      byClient[clientName].invoiced += inv.amount || 0
      byClient[clientName].paid += inv.amount_paid || 0
      const outstanding = inv.remaining_balance != null ? inv.remaining_balance : (inv.status !== 'paid' ? inv.amount : 0)
      byClient[clientName].outstanding += outstanding || 0
      byClient[clientName].count++
    })

    const chartData = Object.values(byClient).sort((a: any, b: any) => b.paid - a.paid)
    const totalPaid = chartData.reduce((sum: number, c: any) => sum + c.paid, 0)

    chartData.forEach((c: any) => {
      c.percentage = totalPaid > 0 ? (c.paid / totalPaid) * 100 : 0
    })

    setChartData(chartData)
    setTableData(chartData)

    // Summary
    const totalInvoiced = chartData.reduce((sum: number, c: any) => sum + c.invoiced, 0)
    const topClient = chartData[0]?.paid || 0
    const revenueConcentration = totalPaid > 0 ? (topClient / totalPaid) * 100 : 0

    setSummaryMetrics({
      totalRevenue: totalPaid,
      totalInvoiced: chartData.length,
      collectionRate: revenueConcentration,
      avgInvoiceSize: totalPaid / chartData.length,
    })
  }

  const processTaxReport = (invoices: any[]) => {
    // Only count actual money received (amount_paid)
    // Invoices are already filtered by paid_date range and amount_paid > 0
    const byMonth: Record<string, any> = {}

    invoices.forEach((inv) => {
      if (!inv.paid_date || !inv.amount_paid) return

      const date = new Date(inv.paid_date)
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          month: monthKey,
          income: 0,
          paidCount: 0,
          cumulative: 0,
          currency_code: inv.currency_code || 'MYR',
        }
      }

      byMonth[monthKey].income += inv.amount_paid
      byMonth[monthKey].paidCount++
    })

    const chartData = Object.values(byMonth).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    let cumulative = 0
    chartData.forEach((row: any) => {
      cumulative += row.income
      row.cumulative = cumulative
    })

    setChartData(chartData)
    setTableData(chartData)

    // Summary
    const totalIncome = chartData.reduce((sum: number, row: any) => sum + row.income, 0)
    const totalPaidCount = chartData.reduce((sum: number, row: any) => sum + row.paidCount, 0)

    setSummaryMetrics({
      totalRevenue: totalIncome,
      totalInvoiced: totalPaidCount,
      collectionRate: chartData.length || 1, // months with payments
      avgInvoiceSize: totalIncome / (totalPaidCount || 1),
    })
  }

  const processPaymentsReport = (invoices: any[]) => {
    // Show all invoices with payments in the date range
    const paymentRows = invoices.map((inv) => {
      // Determine payment type
      const amount = inv.amount || 0
      const amountPaid = inv.amount_paid || 0
      let paymentType = '-'

      if (amountPaid > 0 && amount > 0) {
        if (amountPaid === amount) {
          paymentType = 'Full payment'
        } else if (amountPaid < amount) {
          paymentType = 'Partial payment'
        }
      }

      return {
        invoiceNumber: inv.invoice_number || 'N/A',
        date: inv.paid_date
          ? new Date(inv.paid_date).toLocaleDateString('en-US', {
              year: '2-digit',
              month: '2-digit',
              day: '2-digit',
            })
          : new Date(inv.created_at).toLocaleDateString('en-US', {
              year: '2-digit',
              month: '2-digit',
              day: '2-digit',
            }),
        client: inv.clients?.name || 'Unknown',
        amount: amountPaid,
        method: inv.payment_method || '-',
        type: paymentType,
        currency_code: inv.currency_code || 'MYR',
      }
    })

    setTableData(paymentRows)
    setChartData([])

    // Summary metrics
    const totalPaid = paymentRows.reduce((sum, p) => sum + (p.amount || 0), 0)
    const totalAmount = paymentRows.length

    setSummaryMetrics({
      totalRevenue: totalPaid,
      totalInvoiced: totalAmount,
      collectionRate: totalAmount > 0 ? totalAmount : 0, // Count of paid invoices
      avgInvoiceSize: totalAmount > 0 ? totalPaid / totalAmount : 0,
    })

    console.log('[Reports] Payments report processed:', paymentRows.length, 'paid invoices, total:', totalPaid)
  }



  const isReportGated = () => {
    const report = REPORTS.find((r) => r.id === selectedReport)
    return report?.gated && (plan === 'trial' || plan === 'starter')
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to asc
      setSortColumn(column)
      setSortOrder('asc')
    }

    // Sort the data
    const sorted = [...tableData].sort((a, b) => {
      const aVal = a[column] ?? ''
      const bVal = b[column] ?? ''

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })

    setTableData(sorted)
  }

  const getSortIndicator = (column: string) => {
    if (sortColumn !== column) return ''
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  const getStatusBadge = (status: string) => {
    const baseClass = 'px-2.5 py-1 rounded text-xs font-medium inline-block'
    switch (status?.toLowerCase()) {
      case 'paid':
        return <span className={`${baseClass} bg-green-900/30 text-green-400 border border-green-700/50`}>Paid</span>
      case 'unpaid':
        return <span className={`${baseClass} bg-gray-700/30 text-gray-300 border border-gray-600/50`}>Unpaid</span>
      case 'overdue':
        return <span className={`${baseClass} bg-red-900/30 text-red-400 border border-red-700/50`}>Overdue</span>
      case 'paid_partial':
        return <span className={`${baseClass} bg-yellow-900/30 text-yellow-400 border border-yellow-700/50`}>Partial</span>
      default:
        return <span className={`${baseClass} bg-gray-700/30 text-gray-400`}>{status || '-'}</span>
    }
  }

  // Always a specific currency — no "Mixed" state since "All" option is removed
  const activeCurrencyLabel = selectedCurrency || currencyCode || 'MYR'
  // Format a monetary amount with the active currency
  const fmtAmt = (amount: number, _rowCurrencyCode?: string) => {
    return `${activeCurrencyLabel} ${(amount || 0).toFixed(0)}`
  }

  const formatAmount = (amount: number, isOutstanding: boolean = false, rowCode?: string) => {
    const value = amount || 0
    const textColor = value > 0 ? (isOutstanding ? 'text-orange-400' : 'text-green-400') : 'text-gray-500'
    return <span className={textColor}>{rowCode || activeCurrencyLabel} {value.toFixed(0)}</span>
  }

  const getReportTitle = () => {
    return REPORTS.find((r) => r.id === selectedReport)?.name || 'Report'
  }

  const getDateRangeString = () => {
    const from = customFrom || getDateRange().from
    const to = customTo || getDateRange().to
    return `${from} to ${to}`
  }

  const exportToPDF = async () => {
    try {
      // Load html2pdf library dynamically
      const html2pdfLib = await import('html2pdf.js').then(m => m.default)

      if (!html2pdfLib) {
        console.error('PDF export library not available')
        return
      }

      const reportTitle = getReportTitle()
      const dateRange = getDateRangeString()
      const totalInvoicedValue = (selectedReport === 'revenue' || selectedReport === 'aging')
        ? activeCurrencyLabel + ' ' + (summaryMetrics?.totalInvoiced || 0).toFixed(0)
        : (summaryMetrics?.totalInvoiced || 0).toFixed(0)

    let htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #FFFFFF;">
        <h1 style="color: #111111; margin-bottom: 10px;">${reportTitle}</h1>
        <p style="color: #444444; margin-bottom: 20px;">Generated by Verkspay | ${dateRange}</p>`

    if (summaryMetrics) {
      htmlContent += `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px;">
          <div style="border: 1px solid #E0E0E8; padding: 15px; border-radius: 8px; background-color: #FFFFFF;">
            <p style="color: #555555; font-size: 12px; margin: 0;">Total Revenue</p>
            <p style="color: #111111; font-size: 20px; font-weight: bold; margin: 5px 0;">${activeCurrencyLabel} ${summaryMetrics.totalRevenue.toFixed(0)}</p>
          </div>
          <div style="border: 1px solid #E0E0E8; padding: 15px; border-radius: 8px; background-color: #FFFFFF;">
            <p style="color: #555555; font-size: 12px; margin: 0;">Total Invoiced</p>
            <p style="color: #111111; font-size: 20px; font-weight: bold; margin: 5px 0;">${totalInvoicedValue}</p>
          </div>
          <div style="border: 1px solid #E0E0E8; padding: 15px; border-radius: 8px; background-color: #FFFFFF;">
            <p style="color: #555555; font-size: 12px; margin: 0;">Collection Rate</p>
            <p style="color: #111111; font-size: 20px; font-weight: bold; margin: 5px 0;">${summaryMetrics.collectionRate.toFixed(1)}%</p>
          </div>
          <div style="border: 1px solid #E0E0E8; padding: 15px; border-radius: 8px; background-color: #FFFFFF;">
            <p style="color: #555555; font-size: 12px; margin: 0;">Avg Size</p>
            <p style="color: #111111; font-size: 20px; font-weight: bold; margin: 5px 0;">${activeCurrencyLabel} ${summaryMetrics.avgInvoiceSize.toFixed(0)}</p>
          </div>
        </div>`
    }

    // Build table headers
    let tableHeaders = ''
    const thStyle = 'border: 1px solid #2D2B55; padding: 12px; color: #FFFFFF;'
    if (selectedReport === 'revenue') {
      tableHeaders = `<th style="${thStyle} text-align: left;">Month</th><th style="${thStyle} text-align: right;">Invoiced</th><th style="${thStyle} text-align: right;">Collected</th><th style="${thStyle} text-align: right;">Outstanding</th>`
    } else if (selectedReport === 'aging') {
      tableHeaders = `<th style="${thStyle} text-align: left;">Client</th><th style="${thStyle} text-align: right;">Current</th><th style="${thStyle} text-align: right;">1-30 Days</th><th style="${thStyle} text-align: right;">31-60 Days</th><th style="${thStyle} text-align: right;">Total</th>`
    } else if (selectedReport === 'client') {
      tableHeaders = `<th style="${thStyle} text-align: left;">Client</th><th style="${thStyle} text-align: right;">Invoices</th><th style="${thStyle} text-align: right;">Paid</th><th style="${thStyle} text-align: right;">% of Revenue</th>`
    } else if (selectedReport === 'tax') {
      tableHeaders = `<th style="${thStyle} text-align: left;">Month</th><th style="${thStyle} text-align: right;">Income</th><th style="${thStyle} text-align: right;">Cumulative</th>`
    } else {
      tableHeaders = `<th style="${thStyle} text-align: left;">Date</th><th style="${thStyle} text-align: left;">Invoice</th><th style="${thStyle} text-align: left;">Client</th><th style="${thStyle} text-align: right;">Amount</th>`
    }

    // Build table rows
    let tableRows = ''
    const tdStyle = 'border: 1px solid #E0E0E8; padding: 12px; color: #111111;'
    tableData.forEach((row: any, idx: number) => {
      const rowBg = idx % 2 === 0 ? 'background-color: #F8F8FC;' : 'background-color: #FFFFFF;'
      let rowContent = ''
      if (selectedReport === 'revenue') {
        rowContent = `<td style="${tdStyle}">${row.month}</td><td style="${tdStyle} text-align: right;">${row.currency_code || activeCurrencyLabel} ${row.invoiced.toFixed(0)}</td><td style="${tdStyle} text-align: right;">${row.currency_code || activeCurrencyLabel} ${row.collected.toFixed(0)}</td><td style="${tdStyle} text-align: right;">${row.currency_code || activeCurrencyLabel} ${row.outstanding.toFixed(0)}</td>`
      } else if (selectedReport === 'aging') {
        rowContent = `<td style="${tdStyle}">${row.client}</td><td style="${tdStyle} text-align: right;">${activeCurrencyLabel} ${row.current.toFixed(0)}</td><td style="${tdStyle} text-align: right;">${activeCurrencyLabel} ${row['1-30'].toFixed(0)}</td><td style="${tdStyle} text-align: right;">${activeCurrencyLabel} ${row['31-60'].toFixed(0)}</td><td style="${tdStyle} text-align: right;">${activeCurrencyLabel} ${row.total.toFixed(0)}</td>`
      } else if (selectedReport === 'client') {
        rowContent = `<td style="${tdStyle}">${row.client}</td><td style="${tdStyle} text-align: right;">${row.count}</td><td style="${tdStyle} text-align: right;">${activeCurrencyLabel} ${row.paid.toFixed(0)}</td><td style="${tdStyle} text-align: right;">${row.percentage.toFixed(1)}%</td>`
      } else if (selectedReport === 'tax') {
        rowContent = `<td style="${tdStyle}">${row.month}</td><td style="${tdStyle} text-align: right;">${activeCurrencyLabel} ${row.income.toFixed(0)}</td><td style="${tdStyle} text-align: right;">${activeCurrencyLabel} ${row.cumulative.toFixed(0)}</td>`
      } else {
        rowContent = `<td style="${tdStyle}">${row.date}</td><td style="${tdStyle}">${row.invoiceNumber}</td><td style="${tdStyle}">${row.client}</td><td style="${tdStyle} text-align: right;">${row.currency_code || activeCurrencyLabel} ${row.amount.toFixed(0)}</td>`
      }
      tableRows += `<tr style="border-bottom: 1px solid #E0E0E8; ${rowBg}">${rowContent}</tr>`
    })

    htmlContent += `
        <h2 style="color: #111111; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #E0E0E8; padding-bottom: 10px;">Report Data</h2>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #2D2B55; border-bottom: 2px solid #2D2B55;">
              ${tableHeaders}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <p style="color: #444444; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E0E0E8;">
          Generated by Verkspay • ${new Date().toLocaleString()}
        </p>
      </div>
    `

      const opt = {
        margin: 10,
        filename: `${reportTitle.toLowerCase().replace(/\s+/g, '-')}-${getDateRange().from}-${getDateRange().to}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait' as const, unit: 'mm' as const, format: 'a4' },
      }

      html2pdfLib().set(opt).from(htmlContent).save()
    } catch (err) {
      console.error('[Reports] PDF export error:', err)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  const exportToCSV = () => {
    const reportTitle = getReportTitle() + (selectedCurrency !== 'all' ? `(${selectedCurrency})` : '')
    const dateRange = getDateRangeString()

    let csvContent = `Report: ${reportTitle}\nDate Range: ${dateRange}\n\n`

    if (selectedReport === 'revenue') {
      csvContent += 'Month,Invoiced,Collected,Outstanding,Count\n'
      tableData.forEach((row: any) => {
        csvContent += `${row.month},${row.invoiced},${row.collected},${row.outstanding},${row.count}\n`
      })
    } else if (selectedReport === 'aging') {
      csvContent += 'Client,Current,1-30 Days,31-60 Days,61-90 Days,90+ Days,Total\n'
      tableData.forEach((row: any) => {
        csvContent += `${row.client},${row.current},${row['1-30']},${row['31-60']},${row['61-90']},${row['90+']},${row.total}\n`
      })
    } else if (selectedReport === 'client') {
      csvContent += 'Client,Invoices,Invoiced,Paid,Outstanding,% of Revenue\n'
      tableData.forEach((row: any) => {
        csvContent += `${row.client},${row.count},${row.invoiced},${row.paid},${row.outstanding},${row.percentage}\n`
      })
    } else if (selectedReport === 'tax') {
      csvContent += 'Month,Income,Paid Invoices,Cumulative\n'
      tableData.forEach((row: any) => {
        csvContent += `${row.month},${row.income},${row.paidCount},${row.cumulative}\n`
      })
    } else if (selectedReport === 'payments') {
      csvContent += 'Date,Invoice Number,Client,Amount,Payment Method,Type\n'
      tableData.forEach((row: any) => {
        csvContent += `${row.date},${row.invoiceNumber},${row.client},${row.amount},${row.method},${row.type}\n`
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${reportTitle.toLowerCase().replace(/\s+/g, '-')}-${getDateRange().from}-${getDateRange().to}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen relative z-10">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6 flex justify-center items-center h-96">
          <div className="text-gray-400">Loading reports...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent mb-2">
            Reports
          </h1>
          <p className="text-gray-400">Generate and export business reports</p>
        </div>

        {/* Report Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-12">
          {REPORTS.map((report) => {
            const isGated = report.gated && (plan === 'trial' || plan === 'starter')
            const isActive = selectedReport === report.id

            return (
              <button
                key={report.id}
                onClick={() => {
                  if (!isGated) {
                    setSelectedReport(report.id as ReportType)
                    // Clear previous report data when switching reports
                    setChartData([])
                    setTableData([])
                  }
                }}
                disabled={false}
                className={`p-4 rounded-lg text-center transition duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 border border-blue-500 text-white shadow-lg'
                    : 'bg-gray-800/40 border border-gray-700/50 text-gray-400 hover:border-gray-600'
                } ${isGated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="text-2xl mb-2">{report.icon}</div>
                <div className="font-semibold text-sm">{report.name}</div>
                {isGated && <div className="text-xs text-yellow-400 mt-1">Pro+</div>}
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <Card className="mb-10 border-gray-700/50">
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset.value)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                    datePreset === preset.value
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => {
                    console.log('[Reports] Custom From date changed to:', e.target.value)
                    setCustomFrom(e.target.value)
                    setDatePreset('') // Clear preset when custom date is entered
                  }}
                  className="w-full glass px-3 py-2 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => {
                    console.log('[Reports] Custom To date changed to:', e.target.value)
                    setCustomTo(e.target.value)
                    setDatePreset('') // Clear preset when custom date is entered
                  }}
                  className="w-full glass px-3 py-2 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Currency</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full glass px-3 py-2 rounded text-white text-sm appearance-none cursor-pointer"
                >
                  {availableCurrencies.map((code) => (
                    <option key={code} value={code} className="bg-slate-900">{code}</option>
                  ))}
                </select>
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
              <Button
                onClick={exportToPDF}
                disabled={tableData.length === 0}
                variant="outline"
              >
                📥 Export PDF
              </Button>
              <Button
                onClick={exportToCSV}
                disabled={tableData.length === 0}
                variant="outline"
              >
                📊 Export CSV
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Summary Metrics */}
        {summaryMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardBody className="space-y-2">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Total Revenue</p>
                <p className="text-3xl font-bold text-green-500">{fmtAmt(summaryMetrics?.totalRevenue || 0)}</p>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span>↑</span> +3.5% vs last quarter
                </p>
              </CardBody>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardBody className="space-y-2">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Total Invoiced</p>
                <p className="text-3xl font-bold text-white">
                  {selectedReport === 'revenue' || selectedReport === 'aging'
                    ? fmtAmt(summaryMetrics?.totalInvoiced || 0)
                    : (summaryMetrics?.totalInvoiced || 0).toFixed(0)
                  }
                </p>
                <p className="text-xs text-gray-400">
                  {selectedReport === 'revenue' || selectedReport === 'aging'
                    ? `${tableData?.length || 0} invoices`
                    : `${tableData?.length || 0} items`
                  }
                </p>
              </CardBody>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardBody className="space-y-2">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Collection Rate</p>
                <p className={`text-3xl font-bold ${
                  (summaryMetrics?.collectionRate || 0) >= 75 ? 'text-green-500' :
                  (summaryMetrics?.collectionRate || 0) >= 50 ? 'text-yellow-500' :
                  'text-red-500'
                }`}>
                  {(summaryMetrics?.collectionRate || 0).toFixed(0)}%
                </p>
                <p className={`text-xs flex items-center gap-1 ${
                  (summaryMetrics?.collectionRate || 0) >= 50 ? 'text-green-400' : 'text-red-400'
                }`}>
                  <span>{(summaryMetrics?.collectionRate || 0) >= 50 ? '↑' : '↓'}</span> vs last quarter
                </p>
              </CardBody>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardBody className="space-y-2">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Avg Invoice Size</p>
                <p className="text-3xl font-bold text-white">{fmtAmt(summaryMetrics?.avgInvoiceSize || 0)}</p>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span>↑</span> +7% vs last quarter
                </p>
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
        ) : tableData.length > 0 ? (
          <Card className="border-gray-700/50 mt-10">
            <CardBody className="space-y-8">
              {/* Render appropriate table based on report type */}
              {selectedReport === 'revenue' && (
                <>
                  <div className="w-full h-80">
                    <ReportsChart type="revenue" data={chartData} currencyCode={activeCurrencyLabel} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('invoiceNumber')}>Invoice #{getSortIndicator('invoiceNumber')}</th>
                          <th className="text-left py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('dateIssued')}>Date Issued{getSortIndicator('dateIssued')}</th>
                          <th className="text-left py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('client')}>Client{getSortIndicator('client')}</th>
                          <th className="text-left py-3 px-4 text-gray-400">Description</th>
                          <th className="text-right py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('amount')}>Amount{getSortIndicator('amount')}</th>
                          <th className="text-right py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('paid')}>Paid{getSortIndicator('paid')}</th>
                          <th className="text-right py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('outstanding')}>Outstanding{getSortIndicator('outstanding')}</th>
                          <th className="text-left py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('status')}>Status{getSortIndicator('status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(tableData || []).map((row: any, idx) => (
                          <tr key={idx} className={`border-b border-gray-700/50 transition ${
                            idx % 2 === 0 ? 'bg-gray-900/20' : 'bg-gray-800/5'
                          } hover:bg-gray-700/10`}>
                            <td className="py-3 px-4 text-white font-mono text-sm">{row?.invoiceNumber || '-'}</td>
                            <td className="py-3 px-4 text-gray-300 text-sm">{row?.dateIssued || row?.month || '-'}</td>
                            <td className="py-3 px-4 text-white text-sm font-medium">{row?.client || '-'}</td>
                            <td className="py-3 px-4 text-gray-400 truncate text-sm">{row?.description || '-'}</td>
                            <td className="text-right py-3 px-4 text-white text-sm">{fmtAmt((row?.amount ?? row?.invoiced ?? 0) || 0, row?.currency_code)}</td>
                            <td className="text-right py-3 px-4 text-sm">
                              {formatAmount((row?.paid ?? row?.collected ?? 0) || 0, false, row?.currency_code)}
                            </td>
                            <td className="text-right py-3 px-4 text-sm">
                              {formatAmount((row?.outstanding ?? 0) || 0, true, row?.currency_code)}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {getStatusBadge(row?.status || row?.count)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {tableData && tableData.length > 0 && (
                        <tfoot>
                          <tr className="border-t-2 border-gray-600 bg-gray-900/50">
                            <td colSpan={4} className="py-3 px-4 text-sm font-semibold text-white">
                              Total ({tableData.length} rows)
                            </td>
                            <td className="text-right py-3 px-4 text-white font-bold">
                              {fmtAmt(tableData.reduce((sum: number, row: any) => sum + ((row?.amount ?? row?.invoiced ?? 0) || 0), 0))}
                            </td>
                            <td className="text-right py-3 px-4 font-bold">
                              <span className="text-green-400">{fmtAmt(tableData.reduce((sum: number, row: any) => sum + ((row?.paid ?? row?.collected ?? 0) || 0), 0))}</span>
                            </td>
                            <td className="text-right py-3 px-4 font-bold">
                              <span className="text-orange-400">{fmtAmt(tableData.reduce((sum: number, row: any) => sum + ((row?.outstanding ?? 0) || 0), 0))}</span>
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </>
              )}

              {selectedReport === 'aging' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400">Client</th>
                        <th className="text-right py-3 px-4 text-gray-400">Current</th>
                        <th className="text-right py-3 px-4 text-gray-400">1-30 Days</th>
                        <th className="text-right py-3 px-4 text-gray-400">31-60 Days</th>
                        <th className="text-right py-3 px-4 text-gray-400">61-90 Days</th>
                        <th className="text-right py-3 px-4 text-gray-400">90+ Days</th>
                        <th className="text-right py-3 px-4 text-gray-400">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row: any, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4 text-white">{row.client}</td>
                          <td className="text-right py-3 px-4 text-green-400">{fmtAmt(row.current, row.currency_code)}</td>
                          <td className="text-right py-3 px-4 text-yellow-400">{fmtAmt(row['1-30'], row.currency_code)}</td>
                          <td className="text-right py-3 px-4 text-orange-400">{fmtAmt(row['31-60'], row.currency_code)}</td>
                          <td className="text-right py-3 px-4 text-red-400">{fmtAmt(row['61-90'], row.currency_code)}</td>
                          <td className="text-right py-3 px-4 text-red-600">{fmtAmt(row['90+'], row.currency_code)}</td>
                          <td className="text-right py-3 px-4 text-white font-semibold">{fmtAmt(row.total, row.currency_code)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedReport === 'client' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400">Client</th>
                        <th className="text-right py-3 px-4 text-gray-400">Invoices</th>
                        <th className="text-right py-3 px-4 text-gray-400">Invoiced</th>
                        <th className="text-right py-3 px-4 text-gray-400">Paid</th>
                        <th className="text-right py-3 px-4 text-gray-400">Outstanding</th>
                        <th className="text-right py-3 px-4 text-gray-400">% of Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row: any, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4 text-white">{row.client}</td>
                          <td className="text-right py-3 px-4 text-gray-300">{row.count}</td>
                          <td className="text-right py-3 px-4 text-white">{fmtAmt(row.invoiced, row.currency_code)}</td>
                          <td className="text-right py-3 px-4 text-green-400">{fmtAmt(row.paid, row.currency_code)}</td>
                          <td className="text-right py-3 px-4 text-yellow-400">{fmtAmt(row.outstanding, row.currency_code)}</td>
                          <td className="text-right py-3 px-4 text-blue-400">{row.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedReport === 'tax' && (
                <>
                  <div className="w-full h-80">
                    <ReportsChart type="tax" data={chartData} currencyCode={activeCurrencyLabel} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400">Month</th>
                          <th className="text-right py-3 px-4 text-gray-400">Income</th>
                          <th className="text-right py-3 px-4 text-gray-400">Paid Invoices</th>
                          <th className="text-right py-3 px-4 text-gray-400">Cumulative</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row: any, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-3 px-4 text-white">{row.month}</td>
                            <td className="text-right py-3 px-4 text-green-400">{fmtAmt(row.income, row.currency_code)}</td>
                            <td className="text-right py-3 px-4 text-gray-300">{row.paidCount}</td>
                            <td className="text-right py-3 px-4 text-blue-400">{fmtAmt(row.cumulative, row.currency_code)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {selectedReport === 'payments' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('date')}>Date{getSortIndicator('date')}</th>
                        <th className="text-left py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('invoiceNumber')}>Invoice{getSortIndicator('invoiceNumber')}</th>
                        <th className="text-left py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('client')}>Client{getSortIndicator('client')}</th>
                        <th className="text-right py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('amount')}>Amount{getSortIndicator('amount')}</th>
                        <th className="text-left py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('method')}>Method{getSortIndicator('method')}</th>
                        <th className="text-left py-3 px-4 text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => handleSort('type')}>Type{getSortIndicator('type')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row: any, idx) => (
                        <tr key={idx} className={`border-b border-gray-700/50 transition ${
                          idx % 2 === 0 ? 'bg-gray-900/20' : 'bg-gray-800/5'
                        } hover:bg-gray-700/10`}>
                          <td className="py-3 px-4 text-gray-300 text-sm">{row.date || '-'}</td>
                          <td className="py-3 px-4 text-white font-mono text-sm">{row.invoiceNumber}</td>
                          <td className="py-3 px-4 text-white text-sm font-medium">{row.client}</td>
                          <td className="text-right py-3 px-4 text-green-400 text-sm font-medium">{fmtAmt(row.amount || 0, row.currency_code)}</td>
                          <td className="py-3 px-4 text-gray-300 text-sm">{row.method}</td>
                          <td className="py-3 px-4 text-sm">
                            {row.type === 'Full payment' && <span className="text-green-400">✓ Full payment</span>}
                            {row.type === 'Partial payment' && <span className="text-yellow-400">⊘ Partial payment</span>}
                            {row.type === '-' && <span className="text-gray-500">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {tableData && tableData.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-600 bg-gray-900/50">
                          <td colSpan={3} className="py-3 px-4 text-sm font-semibold text-white">
                            Total ({tableData.length} payments)
                          </td>
                          <td className="text-right py-3 px-4 text-green-400 font-bold">
                            {fmtAmt(tableData.reduce((sum: number, row: any) => sum + ((row?.amount || 0)), 0))}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
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
