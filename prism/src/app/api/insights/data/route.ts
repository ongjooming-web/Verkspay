import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-server'
import { isMasterAccount } from '@/utils/isMasterAccount'

export type InsightsData = {
  // Revenue overview
  revenue: {
    total_paid: number
    total_pending: number
    total_overdue: number
    currency_code: string // most used currency
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
    // 1. Verify authentication
    const { user, error: authError } = await requireAuth(request)
    if (authError) {
      console.error('[insights/data] Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      )
    }

    const userId = user.id
    const userEmail = user.email
    const supabase = getSupabaseServer()

    console.log(`[insights/data] Fetching aggregated data for user ${userId} (${userEmail})`)

    // Master test accounts get unlimited access
    if (isMasterAccount(userEmail)) {
      console.log(`[insights/data] Master test account detected - bypassing all limits`)
    }

    // 2. Fetch user's profile to get account age and preferred currency
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('created_at, currency_code')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[insights/data] Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    const profileCreatedAt = profile?.created_at ? new Date(profile.created_at) : new Date()
    const accountAgeDays = Math.floor((Date.now() - profileCreatedAt.getTime()) / (1000 * 60 * 60 * 24))

    // 3. Fetch all invoices for the user (JOIN with clients)
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(
        `
        id,
        client_id,
        amount,
        amount_paid,
        remaining_balance,
        status,
        created_at,
        paid_date,
        due_date,
        payment_method,
        currency_code,
        clients:client_id(id, name)
        `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (invoicesError) {
      console.error('[insights/data] Error fetching invoices:', invoicesError)
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      )
    }

    // 4. Handle empty invoices case
    if (!invoices || invoices.length === 0) {
      console.log(`[insights/data] No invoices found for user ${userId}`)
      return NextResponse.json<InsightsData>({
        revenue: {
          total_paid: 0,
          total_pending: 0,
          total_overdue: 0,
          currency_code: profile?.currency_code || 'USD'
        },
        invoices: {
          total_count: 0,
          paid_count: 0,
          pending_count: 0,
          overdue_count: 0,
          draft_count: 0,
          average_amount: 0,
          largest_invoice: 0,
          smallest_invoice: 0
        },
        clients: [],
        payments: {
          on_time_count: 0,
          late_count: 0,
          average_days_to_payment: null,
          payment_methods: []
        },
        monthly_revenue: [],
        account_age_days: accountAgeDays,
        data_generated_at: new Date().toISOString()
      })
    }

    // 5. Parse and normalize invoice data
    interface ParsedInvoice {
      id: string
      client_id: string
      client_name: string
      amount: number
      amount_paid: number
      remaining_balance: number
      status: string
      created_at: Date
      paid_date: Date | null
      due_date: Date | null
      payment_method: string | null
      currency_code: string
    }

    const parsedInvoices: ParsedInvoice[] = invoices.map((inv: any) => ({
      id: inv.id,
      client_id: inv.client_id,
      client_name: inv.clients?.name || 'Unknown Client',
      amount: parseFloat(inv.amount?.toString() || '0'),
      amount_paid: parseFloat(inv.amount_paid?.toString() || '0'),
      remaining_balance: parseFloat(inv.remaining_balance?.toString() || '0'),
      status: inv.status || 'draft',
      created_at: new Date(inv.created_at),
      paid_date: inv.paid_date ? new Date(inv.paid_date) : null,
      due_date: inv.due_date ? new Date(inv.due_date) : null,
      payment_method: inv.payment_method || null,
      currency_code: inv.currency_code || profile?.currency_code || 'USD'
    }))

    // 6. Calculate revenue totals by status
    let totalPaid = 0
    let totalPending = 0
    let totalOverdue = 0

    const now = new Date()

    parsedInvoices.forEach((inv) => {
      if (inv.status === 'paid') {
        totalPaid += inv.amount
      } else if (inv.status === 'draft') {
        // Drafts don't count toward pending
      } else {
        // pending, partial_paid, overdue
        if (inv.due_date && inv.due_date < now && inv.status !== 'paid') {
          totalOverdue += inv.remaining_balance
        } else {
          totalPending += inv.remaining_balance
        }
      }
    })

    // 7. Calculate invoice statistics
    const invoiceStats = {
      total_count: parsedInvoices.length,
      paid_count: parsedInvoices.filter((inv) => inv.status === 'paid').length,
      pending_count: parsedInvoices.filter(
        (inv) => inv.status !== 'paid' && inv.status !== 'draft' && (!inv.due_date || inv.due_date >= now)
      ).length,
      overdue_count: parsedInvoices.filter(
        (inv) => inv.status !== 'paid' && inv.due_date && inv.due_date < now
      ).length,
      draft_count: parsedInvoices.filter((inv) => inv.status === 'draft').length,
      average_amount: parsedInvoices.reduce((sum, inv) => sum + inv.amount, 0) / parsedInvoices.length,
      largest_invoice: Math.max(...parsedInvoices.map((inv) => inv.amount)),
      smallest_invoice: Math.min(...parsedInvoices.map((inv) => inv.amount))
    }

    // 8. Group by client for client breakdown
    interface ClientData {
      client_id: string
      client_name: string
      total_invoices: number
      total_revenue: number
      paid_invoices: number
      overdue_invoices: number
      payment_days: number[]
      last_invoice_date: Date | null
      outstanding_balance: number
    }

    const clientMap = new Map<string, ClientData>()

    parsedInvoices.forEach((inv) => {
      if (!clientMap.has(inv.client_id)) {
        clientMap.set(inv.client_id, {
          client_id: inv.client_id,
          client_name: inv.client_name,
          total_invoices: 0,
          total_revenue: 0,
          paid_invoices: 0,
          overdue_invoices: 0,
          payment_days: [],
          last_invoice_date: null,
          outstanding_balance: 0
        })
      }

      const clientData = clientMap.get(inv.client_id)!
      clientData.total_invoices += 1
      clientData.total_revenue += inv.amount

      if (inv.status === 'paid') {
        clientData.paid_invoices += 1
        // Calculate days to payment for paid invoices
        if (inv.paid_date && inv.created_at) {
          const daysToPayment = Math.floor(
            (inv.paid_date.getTime() - inv.created_at.getTime()) / (1000 * 60 * 60 * 24)
          )
          clientData.payment_days.push(daysToPayment)
        }
      } else if (inv.due_date && inv.due_date < now && inv.status !== 'draft') {
        clientData.overdue_invoices += 1
      }

      // Update last invoice date
      if (!clientData.last_invoice_date || inv.created_at > clientData.last_invoice_date) {
        clientData.last_invoice_date = inv.created_at
      }

      // Add to outstanding balance
      if (inv.status !== 'paid' && inv.status !== 'draft') {
        clientData.outstanding_balance += inv.remaining_balance
      }
    })

    // Convert client map to array with calculated averages
    const clientsList = Array.from(clientMap.values()).map((client) => ({
      client_id: client.client_id,
      client_name: client.client_name,
      total_invoices: client.total_invoices,
      total_revenue: parseFloat(client.total_revenue.toFixed(2)),
      paid_invoices: client.paid_invoices,
      overdue_invoices: client.overdue_invoices,
      average_payment_days:
        client.payment_days.length > 0
          ? Math.round(client.payment_days.reduce((a, b) => a + b, 0) / client.payment_days.length)
          : null,
      last_invoice_date: client.last_invoice_date ? client.last_invoice_date.toISOString().split('T')[0] : null,
      outstanding_balance: parseFloat(client.outstanding_balance.toFixed(2))
    }))

    // 9. Calculate payment patterns
    // Count on-time vs late payments
    let onTimeCount = 0
    let lateCount = 0
    const paymentDaysForAverage: number[] = []
    const paymentMethodMap = new Map<string, number>()

    parsedInvoices.forEach((inv) => {
      if (inv.status === 'paid' && inv.due_date && inv.paid_date) {
        const daysToPayment = Math.floor(
          (inv.paid_date.getTime() - inv.created_at.getTime()) / (1000 * 60 * 60 * 24)
        )
        paymentDaysForAverage.push(daysToPayment)

        if (inv.paid_date <= inv.due_date) {
          onTimeCount += 1
        } else {
          lateCount += 1
        }

        // Track payment methods
        const method = inv.payment_method || 'unknown'
        paymentMethodMap.set(method, (paymentMethodMap.get(method) || 0) + 1)
      }
    })

    const averageDaysToPayment =
      paymentDaysForAverage.length > 0
        ? Math.round(paymentDaysForAverage.reduce((a, b) => a + b, 0) / paymentDaysForAverage.length)
        : null

    const paymentMethods = Array.from(paymentMethodMap.entries()).map(([method, count]) => ({
      method,
      count
    }))

    // 10. Calculate monthly revenue (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    interface MonthlyData {
      invoiced: number
      collected: number
      invoice_count: number
    }

    const monthlyMap = new Map<string, MonthlyData>()

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = date.toISOString().slice(0, 7) // YYYY-MM format
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { invoiced: 0, collected: 0, invoice_count: 0 })
      }
    }

    // Populate monthly data from invoices
    parsedInvoices.forEach((inv) => {
      if (inv.created_at >= sixMonthsAgo) {
        const monthKey = inv.created_at.toISOString().slice(0, 7)
        const monthData = monthlyMap.get(monthKey) || { invoiced: 0, collected: 0, invoice_count: 0 }

        monthData.invoiced += inv.amount
        monthData.invoice_count += 1

        if (inv.status === 'paid') {
          monthData.collected += inv.amount
        }

        monthlyMap.set(monthKey, monthData)
      }
    })

    const monthlyRevenue = Array.from(monthlyMap.entries())
      .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
      .map(([month, data]) => ({
        month,
        invoiced: parseFloat(data.invoiced.toFixed(2)),
        collected: parseFloat(data.collected.toFixed(2)),
        invoice_count: data.invoice_count
      }))

    // 11. Determine most used currency
    const currencyUsage = new Map<string, number>()
    parsedInvoices.forEach((inv) => {
      const currency = inv.currency_code || 'USD'
      currencyUsage.set(currency, (currencyUsage.get(currency) || 0) + 1)
    })

    let mostUsedCurrency = profile?.currency_code || 'USD'
    let maxCount = 0
    currencyUsage.forEach((count, currency) => {
      if (count > maxCount) {
        maxCount = count
        mostUsedCurrency = currency
      }
    })

    // 12. Compile final response
    const response: InsightsData = {
      revenue: {
        total_paid: parseFloat(totalPaid.toFixed(2)),
        total_pending: parseFloat(totalPending.toFixed(2)),
        total_overdue: parseFloat(totalOverdue.toFixed(2)),
        currency_code: mostUsedCurrency
      },
      invoices: {
        total_count: invoiceStats.total_count,
        paid_count: invoiceStats.paid_count,
        pending_count: invoiceStats.pending_count,
        overdue_count: invoiceStats.overdue_count,
        draft_count: invoiceStats.draft_count,
        average_amount: parseFloat(invoiceStats.average_amount.toFixed(2)),
        largest_invoice: invoiceStats.largest_invoice,
        smallest_invoice: invoiceStats.smallest_invoice
      },
      clients: clientsList,
      payments: {
        on_time_count: onTimeCount,
        late_count: lateCount,
        average_days_to_payment: averageDaysToPayment,
        payment_methods: paymentMethods
      },
      monthly_revenue: monthlyRevenue,
      account_age_days: accountAgeDays,
      data_generated_at: new Date().toISOString()
    }

    console.log(
      `[insights/data] Successfully aggregated data for user ${userId}: ${invoiceStats.total_count} invoices, ${clientsList.length} clients`
    )

    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    console.error('[insights/data] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
