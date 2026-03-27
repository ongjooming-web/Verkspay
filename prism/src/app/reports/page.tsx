'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'

// Dynamically import chart component (browser-only)
const ReportsChart = dynamic(() => import('@/components/ReportsChart').then((mod) => mod.ReportsChart), {
  ssr: false,
})

// Dynamically import html2pdf (browser-only)
let html2pdf: any = null
if (typeof window !== 'undefined') {
  html2pdf = require('html2pdf.js').default
}

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

    const fromStr = from.toISOString().split('T')[0]
    const toStr = to.toISOString().split('T')[0]

    return { from: fromStr, to: toStr }
  }

  const handlePresetClick = (preset: string) => {
    setDatePreset(preset)
    const range = getDateRange()
    setCustomFrom(range.from)
    setCustomTo(range.to)
    // Automatically generate report with new dates
    setTimeout(() => handleGenerateReport(), 100)
  }

  const handleGenerateReport = async () => {
    if (!user) return

    setReportLoading(true)
    try {
      // Use custom dates if provided, otherwise use preset range
      let from = customFrom
      let to = customTo

      if (!from || !to) {
        const dateRange = getDateRange()
        from = from || dateRange.from
        to = to || dateRange.to
      }

      console.log('[ReportsPage] Generating report with date range:', { from, to, selectedReport })

      // Validate date range
      if (new Date(from) > new Date(to)) {
        console.error('[ReportsPage] Invalid date range: from > to')
        return
      }

      // For Tax Report, use paid_date instead of created_at
      if (selectedReport === 'tax') {
        let query = supabase
          .from('invoices')
          .select('*, clients(id, name, email)')
          .eq('user_id', user.id)
          .gte('paid_date', from)
          .lte('paid_date', to)
          .gt('amount_paid', 0) // Only paid invoices

        if (selectedClient !== 'all') {
          query = query.eq('client_id', selectedClient)
        }

        const { data: invoices, error } = await query
        if (error) {
          console.error('[ReportsPage] Query error:', error)
          return
        }
        processTaxReport(invoices || [])
      }
      // For Payment Report, fetch from payment_records with date filter
      else if (selectedReport === 'payments') {
        let query = supabase
          .from('payment_records')
          .select('*, invoices(invoice_number, amount, clients(name))')
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: false })

        const { data: payments, error } = await query
        if (error) {
          console.error('[ReportsPage] Query error:', error)
          return
        }

        const paymentData = (payments || []).map((p: any) => ({
          date: new Date(p.created_at).toLocaleDateString(),
          invoiceNumber: p.invoices?.invoice_number || 'N/A',
          client: p.invoices?.clients?.name || 'Unknown',
          amount: p.amount || 0,
          method: p.payment_method || 'Unknown',
          type: p.amount < (p.invoices?.amount || 0) ? 'Partial' : 'Full',
        }))

        setTableData(paymentData)

        const totalAmount = paymentData.reduce((sum: number, p: any) => sum + p.amount, 0)
        setSummaryMetrics({
          totalRevenue: totalAmount,
          totalInvoiced: paymentData.length,
          collectionRate: paymentData.length,
          avgInvoiceSize: paymentData.length > 0 ? totalAmount / paymentData.length : 0,
        })
      }
      // For all other reports, use created_at (invoice creation date)
      else {
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
        }
      }
    } catch (err) {
      console.error('[ReportsPage] Error:', err)
    } finally {
      setReportLoading(false)
    }
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
        }
      }

      const balance = inv.remaining_balance || inv.amount

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
        }
      }

      byClient[clientName].invoiced += inv.amount || 0
      byClient[clientName].paid += inv.amount_paid || 0
      byClient[clientName].outstanding += inv.remaining_balance || 0
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



  const isReportGated = () => {
    const report = REPORTS.find((r) => r.id === selectedReport)
    return report?.gated && (plan === 'trial' || plan === 'starter')
  }

  const getReportTitle = () => {
    return REPORTS.find((r) => r.id === selectedReport)?.name || 'Report'
  }

  const getDateRangeString = () => {
    const from = customFrom || getDateRange().from
    const to = customTo || getDateRange().to
    return `${from} to ${to}`
  }

  const exportToPDF = () => {
    if (!html2pdf) {
      console.error('PDF export not available')
      return
    }

    const reportTitle = getReportTitle()
    const dateRange = getDateRangeString()

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #1f2937; margin-bottom: 10px;">${reportTitle}</h1>
        <p style="color: #6b7280; margin-bottom: 20px;">Generated by Prism | ${dateRange}</p>

        ${summaryMetrics ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px;">
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Total Revenue</p>
              <p style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 5px 0;">MYR ${summaryMetrics.totalRevenue.toFixed(0)}</p>
            </div>
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Total Invoiced</p>
              <p style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 5px 0;">MYR ${summaryMetrics.totalInvoiced.toFixed(0)}</p>
            </div>
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Collection Rate</p>
              <p style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 5px 0;">${summaryMetrics.collectionRate.toFixed(1)}%</p>
            </div>
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Avg Size</p>
              <p style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 5px 0;">MYR ${summaryMetrics.avgInvoiceSize.toFixed(0)}</p>
            </div>
          </div>
        ` : ''}

        <h2 style="color: #1f2937; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Report Data</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db;">
              ${selectedReport === 'revenue' ? `
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Month</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">Invoiced</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">Collected</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">Outstanding</th>
              ` : selectedReport === 'aging' ? `
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Client</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">Current</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">1-30 Days</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">31-60 Days</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">Total</th>
              ` : selectedReport === 'client' ? `
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Client</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">Invoices</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">Paid</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">% of Revenue</th>
              ` : selectedReport === 'tax' ? `
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Month</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">Income</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">Cumulative</th>
              ` : `
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Date</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Invoice</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">Client</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">Amount</th>
              `}
            </tr>
          </thead>
          <tbody>
            ${tableData.map((row: any, idx: number) => `
              <tr style="border-bottom: 1px solid #e5e7eb; ${idx % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
                ${selectedReport === 'revenue' ? `
                  <td style="border: 1px solid #d1d5db; padding: 12px;">${row.month}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">MYR ${row.invoiced.toFixed(0)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">MYR ${row.collected.toFixed(0)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">MYR ${row.outstanding.toFixed(0)}</td>
                ` : selectedReport === 'aging' ? `
                  <td style="border: 1px solid #d1d5db; padding: 12px;">${row.client}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">MYR ${row.current.toFixed(0)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">MYR ${row['1-30'].toFixed(0)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">MYR ${row['31-60'].toFixed(0)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">MYR ${row.total.toFixed(0)}</td>
                ` : selectedReport === 'client' ? `
                  <td style="border: 1px solid #d1d5db; padding: 12px;">${row.client}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">${row.count}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">MYR ${row.paid.toFixed(0)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">${row.percentage.toFixed(1)}%</td>
                ` : selectedReport === 'tax' ? `
                  <td style="border: 1px solid #d1d5db; padding: 12px;">${row.month}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">MYR ${row.income.toFixed(0)}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">MYR ${row.cumulative.toFixed(0)}</td>
                ` : `
                  <td style="border: 1px solid #d1d5db; padding: 12px;">${row.date}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px;">${row.invoiceNumber}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px;">${row.client}</td>
                  <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">MYR ${row.amount.toFixed(0)}</td>
                `}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          Generated by Prism • ${new Date().toLocaleString()}
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

    html2pdf().set(opt).from(htmlContent).save()
  }

  const exportToCSV = () => {
    const reportTitle = getReportTitle()
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
                  onClick={() => handlePresetClick(preset.value)}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardBody>
                <p className="text-gray-400 text-sm mb-1">Total revenue</p>
                <p className="text-2xl font-bold text-green-400">MYR {(summaryMetrics?.totalRevenue || 0).toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">+3.5% vs last quarter</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-gray-400 text-sm mb-1">Total invoiced</p>
                <p className="text-2xl font-bold text-white">MYR {(summaryMetrics?.totalInvoiced || 0).toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">{tableData?.length || 0} invoices</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-gray-400 text-sm mb-1">Collection rate</p>
                <p className="text-2xl font-bold text-blue-400">{(summaryMetrics?.collectionRate || 0).toFixed(0)}%</p>
                <p className="text-xs text-gray-500 mt-1">3% vs last quarter</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-gray-400 text-sm mb-1">Avg invoice size</p>
                <p className="text-2xl font-bold text-purple-400">MYR {(summaryMetrics?.avgInvoiceSize || 0).toFixed(0)}</p>
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
        ) : tableData.length > 0 ? (
          <Card className="border-blue-500/30">
            <CardBody className="space-y-8">
              {/* Render appropriate table based on report type */}
              {selectedReport === 'revenue' && (
                <>
                  <div className="w-full h-80">
                    <ReportsChart type="revenue" data={chartData} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400">Invoice #</th>
                          <th className="text-left py-3 px-4 text-gray-400">Date Issued</th>
                          <th className="text-left py-3 px-4 text-gray-400">Client</th>
                          <th className="text-left py-3 px-4 text-gray-400">Description</th>
                          <th className="text-right py-3 px-4 text-gray-400">Amount</th>
                          <th className="text-right py-3 px-4 text-gray-400">Paid</th>
                          <th className="text-right py-3 px-4 text-gray-400">Outstanding</th>
                          <th className="text-left py-3 px-4 text-gray-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row: any, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-3 px-4 text-white font-mono">{row.invoiceNumber}</td>
                            <td className="py-3 px-4 text-gray-300">{row.dateIssued || row.month}</td>
                            <td className="py-3 px-4 text-white">{row.client}</td>
                            <td className="py-3 px-4 text-gray-300 truncate">{row.description}</td>
                            <td className="text-right py-3 px-4 text-white">MYR {(row.amount || row.invoiced || 0).toFixed(0)}</td>
                            <td className="text-right py-3 px-4 text-green-400">MYR {(row.paid || row.collected || 0).toFixed(0)}</td>
                            <td className="text-right py-3 px-4 text-yellow-400">MYR {(row.outstanding || 0).toFixed(0)}</td>
                            <td className="py-3 px-4 text-gray-300 text-xs">{row.status || row.count}</td>
                          </tr>
                        ))}
                      </tbody>
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
                          <td className="text-right py-3 px-4 text-green-400">MYR {row.current.toFixed(0)}</td>
                          <td className="text-right py-3 px-4 text-yellow-400">MYR {row['1-30'].toFixed(0)}</td>
                          <td className="text-right py-3 px-4 text-orange-400">MYR {row['31-60'].toFixed(0)}</td>
                          <td className="text-right py-3 px-4 text-red-400">MYR {row['61-90'].toFixed(0)}</td>
                          <td className="text-right py-3 px-4 text-red-600">MYR {row['90+'].toFixed(0)}</td>
                          <td className="text-right py-3 px-4 text-white font-semibold">MYR {row.total.toFixed(0)}</td>
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
                          <td className="text-right py-3 px-4 text-white">MYR {row.invoiced.toFixed(0)}</td>
                          <td className="text-right py-3 px-4 text-green-400">MYR {row.paid.toFixed(0)}</td>
                          <td className="text-right py-3 px-4 text-yellow-400">MYR {row.outstanding.toFixed(0)}</td>
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
                    <ReportsChart type="tax" data={chartData} />
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
                            <td className="text-right py-3 px-4 text-green-400">MYR {row.income.toFixed(0)}</td>
                            <td className="text-right py-3 px-4 text-gray-300">{row.paidCount}</td>
                            <td className="text-right py-3 px-4 text-blue-400">MYR {row.cumulative.toFixed(0)}</td>
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
                        <th className="text-left py-3 px-4 text-gray-400">Date</th>
                        <th className="text-left py-3 px-4 text-gray-400">Invoice</th>
                        <th className="text-left py-3 px-4 text-gray-400">Client</th>
                        <th className="text-right py-3 px-4 text-gray-400">Amount</th>
                        <th className="text-left py-3 px-4 text-gray-400">Method</th>
                        <th className="text-left py-3 px-4 text-gray-400">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row: any, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4 text-gray-300">{row.date}</td>
                          <td className="py-3 px-4 text-white">{row.invoiceNumber}</td>
                          <td className="py-3 px-4 text-white">{row.client}</td>
                          <td className="text-right py-3 px-4 text-green-400">MYR {row.amount.toFixed(0)}</td>
                          <td className="py-3 px-4 text-gray-300">{row.method}</td>
                          <td className="py-3 px-4 text-gray-300">{row.type}</td>
                        </tr>
                      ))}
                    </tbody>
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
