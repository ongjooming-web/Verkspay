import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type InsightsData = {
  // Revenue overview
  revenue: {
    total_paid: number
    total_pending: number
    total_overdue: number
    currency_code: string
  }

  // Invoice stats
  invoices: {
    total_count: number
    paid_count: number
    pending_count: number
    overdue_count: number
    draft_count: number
    average_amount: number
    largest_invoice: number
    smallest_invoice: number
  }

  // Client breakdown
  clients: {
    client_id: string
    client_name: string
    total_invoices: number
    total_revenue: number
    paid_invoices: number
    overdue_invoices: number
    average_payment_days: number | null
    last_invoice_date: string | null
    outstanding_balance: number
  }[]

  // Payment patterns
  payments: {
    on_time_count: number
    late_count: number
    average_days_to_payment: number | null
    payment_methods: { method: string; count: number }[]
  }

  // Timeline data (last 6 months)
  monthly_revenue: {
    month: string
    invoiced: number
    collected: number
    invoice_count: number
  }[]

  // Metadata
  account_age_days: number
  data_generated_at: string
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify token and get user
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = data.user.id
    console.log('[Insights] Data request for user:', userId)

    // Fetch all invoices for the user
    const { data: invoicesData, error: invoiceError } = await supabase
      .from('invoices')
      .select(
        `
        id,
        invoice_number,
        user_id,
        client_id,
        amount,
        currency_code,
        status,
        created_at,
        due_date,
        paid_date,
        clients (id, name)
      `
      )
      .eq('user_id', userId)

    if (invoiceError) {
      console.error('[Insights] Error fetching invoices:', invoiceError)
    }

    const invoices = invoicesData || []

    // If no invoices, return zeroed-out data
    if (!invoices || invoices.length === 0) {
      console.log('[Insights] No invoices found for user, returning empty data')
      return NextResponse.json({
        revenue: {
          total_paid: 0,
          total_pending: 0,
          total_overdue: 0,
          currency_code: 'USD',
        },
        invoices: {
          total_count: 0,
          paid_count: 0,
          pending_count: 0,
          overdue_count: 0,
          draft_count: 0,
          average_amount: 0,
          largest_invoice: 0,
          smallest_invoice: 0,
        },
        clients: [],
        payments: {
          on_time_count: 0,
          late_count: 0,
          average_days_to_payment: null,
          payment_methods: [],
        },
        monthly_revenue: [],
        account_age_days: 0,
        data_generated_at: new Date().toISOString(),
      } as InsightsData)
    }

    // Calculate revenue totals
    const now = new Date()
    let totalPaid = 0
    let totalPending = 0
    let totalOverdue = 0
    const paidInvoices: any[] = []
    const pendingInvoices: any[] = []
    const overDueInvoices: any[] = []
    const draftInvoices: any[] = []
    const amounts: number[] = []

    invoices.forEach((invoice: any) => {
      const amount = parseFloat(invoice.amount) || 0
      amounts.push(amount)

      if (invoice.status === 'paid') {
        totalPaid += amount
        paidInvoices.push(invoice)
      } else if (invoice.status === 'draft') {
        draftInvoices.push(invoice)
      } else {
        // pending, partial, etc.
        if (invoice.due_date && new Date(invoice.due_date) < now) {
          totalOverdue += amount
          overDueInvoices.push(invoice)
        } else {
          totalPending += amount
          pendingInvoices.push(invoice)
        }
      }
    })

    // Determine most used currency
    const currencyMap = new Map<string, number>()
    invoices.forEach((inv: any) => {
      const code = inv.currency_code || 'USD'
      currencyMap.set(code, (currencyMap.get(code) || 0) + 1)
    })
    const currency = Array.from(currencyMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'USD'

    // Client breakdown
    const clientMap = new Map<string, any>()
    invoices.forEach((inv: any) => {
      const clientId = inv.client_id
      const clientName = inv.clients?.name || 'Unknown'

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client_id: clientId,
          client_name: clientName,
          total_invoices: 0,
          total_revenue: 0,
          paid_invoices: 0,
          overdue_invoices: 0,
          payment_days: [],
          last_invoice_date: null,
          outstanding_balance: 0,
        })
      }

      const client = clientMap.get(clientId)
      const amount = parseFloat(inv.amount) || 0

      client.total_invoices++
      client.total_revenue += amount
      if (inv.status === 'paid') {
        client.paid_invoices++
        // Calculate payment days
        if (inv.created_at && inv.paid_date) {
          const created = new Date(inv.created_at).getTime()
          const paid = new Date(inv.paid_date).getTime()
          const days = Math.round((paid - created) / (1000 * 60 * 60 * 24))
          client.payment_days.push(days)
        }
      } else if (inv.due_date && new Date(inv.due_date) < now) {
        client.overdue_invoices++
        client.outstanding_balance += amount
      } else {
        client.outstanding_balance += amount
      }

      if (!client.last_invoice_date || new Date(inv.created_at) > new Date(client.last_invoice_date)) {
        client.last_invoice_date = inv.created_at
      }
    })

    const clients = Array.from(clientMap.values()).map((c: any) => ({
      client_id: c.client_id,
      client_name: c.client_name,
      total_invoices: c.total_invoices,
      total_revenue: c.total_revenue,
      paid_invoices: c.paid_invoices,
      overdue_invoices: c.overdue_invoices,
      average_payment_days:
        c.payment_days.length > 0
          ? Math.round(c.payment_days.reduce((a: number, b: number) => a + b, 0) / c.payment_days.length)
          : null,
      last_invoice_date: c.last_invoice_date,
      outstanding_balance: c.outstanding_balance,
    }))

    // Payment patterns
    let onTimeCount = 0
    let lateCount = 0
    const paymentDays: number[] = []
    const methodMap = new Map<string, number>()

    paidInvoices.forEach((inv: any) => {
      if (inv.due_date && inv.paid_date) {
        const dueDate = new Date(inv.due_date).getTime()
        const paidDate = new Date(inv.paid_date).getTime()
        const days = Math.round((paidDate - dueDate) / (1000 * 60 * 60 * 24))

        if (days <= 0) {
          onTimeCount++
        } else {
          lateCount++
        }
        paymentDays.push(Math.abs(days))
      }
    })

    const averagePaymentDays = paymentDays.length > 0 ? Math.round(paymentDays.reduce((a, b) => a + b, 0) / paymentDays.length) : null

    // Monthly revenue (last 6 months)
    const monthlyMap = new Map<string, { invoiced: number; collected: number; count: number }>()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)

    invoices.forEach((inv: any) => {
      const createdDate = new Date(inv.created_at)
      if (createdDate >= sixMonthsAgo) {
        const monthKey = createdDate.toISOString().substring(0, 7) // "2026-01"
        const amount = parseFloat(inv.amount) || 0

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { invoiced: 0, collected: 0, count: 0 })
        }

        const monthData = monthlyMap.get(monthKey)!
        monthData.invoiced += amount
        monthData.count++

        if (inv.status === 'paid') {
          monthData.collected += amount
        }
      }
    })

    const monthlyRevenue = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        invoiced: data.invoiced,
        collected: data.collected,
        invoice_count: data.count,
      }))

    // Account age
    const oldestInvoice = invoices.reduce((oldest: any, current: any) => {
      return new Date(current.created_at) < new Date(oldest.created_at) ? current : oldest
    })
    const accountAgeDays = Math.round((now.getTime() - new Date(oldestInvoice.created_at).getTime()) / (1000 * 60 * 60 * 24))

    const insightsData: InsightsData = {
      revenue: {
        total_paid: totalPaid,
        total_pending: totalPending,
        total_overdue: totalOverdue,
        currency_code: currency,
      },
      invoices: {
        total_count: invoices.length,
        paid_count: paidInvoices.length,
        pending_count: pendingInvoices.length,
        overdue_count: overDueInvoices.length,
        draft_count: draftInvoices.length,
        average_amount: amounts.length > 0 ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length) : 0,
        largest_invoice: Math.max(...amounts),
        smallest_invoice: amounts.filter((a) => a > 0).length > 0 ? Math.min(...amounts.filter((a) => a > 0)) : 0,
      },
      clients,
      payments: {
        on_time_count: onTimeCount,
        late_count: lateCount,
        average_days_to_payment: averagePaymentDays,
        payment_methods: Array.from(methodMap.entries()).map(([method, count]) => ({ method, count })),
      },
      monthly_revenue: monthlyRevenue,
      account_age_days: accountAgeDays,
      data_generated_at: now.toISOString(),
    }

    console.log('[Insights] Data aggregation complete:', { userId, invoiceCount: invoices.length })
    return NextResponse.json(insightsData)
  } catch (error) {
    console.error('[Insights] Data error:', error)
    return NextResponse.json(
      { error: 'Failed to aggregate business data' },
      { status: 500 }
    )
  }
}
