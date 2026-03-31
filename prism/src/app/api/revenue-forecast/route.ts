import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data, error: authError } = await supabase.auth.getUser(token)

    if (authError || !data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = data.user.id

    // Check plan gating - Enterprise only, and fetch preferred currency
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, currency_code')
      .eq('id', userId)
      .single()

    const preferredCurrency = profile?.currency_code || 'MYR'

    const plan = profile?.plan || 'trial'

    // Master test account bypass
    const masterTestEmails = (process.env.MASTER_TEST_EMAILS || '').split(',')
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const isMasterTest = masterTestEmails.includes(userData?.user?.email || '')

    if (!isMasterTest && plan !== 'enterprise') {
      return NextResponse.json(
        { error: 'Revenue forecasting requires Enterprise plan', upgrade: true },
        { status: 403 }
      )
    }

    // Get all recurring invoices
    const { data: recurringInvoices } = await supabase
      .from('recurring_invoices')
      .select('id, client_id, amount, frequency, status, last_generated_date')
      .eq('user_id', userId)
      .eq('status', 'active')

    // Get outstanding invoices in preferred currency only (unpaid + paid_partial)
    const { data: outstandingInvoicesRaw } = await supabase
      .from('invoices')
      .select('id, client_id, amount, remaining_balance, due_date, status, currency_code')
      .eq('user_id', userId)
      .in('status', ['unpaid', 'paid_partial', 'overdue'])
    const outstandingInvoices = (outstandingInvoicesRaw || []).filter(
      inv => (inv.currency_code || 'MYR') === preferredCurrency
    )

    // Get historical invoices in preferred currency for trend analysis (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: historicalInvoicesRaw } = await supabase
      .from('invoices')
      .select('id, amount, created_at, status, currency_code')
      .eq('user_id', userId)
      .eq('status', 'paid')
      .gte('created_at', sixMonthsAgo.toISOString())
    const historicalInvoices = (historicalInvoicesRaw || []).filter(
      inv => (inv.currency_code || 'MYR') === preferredCurrency
    )

    // Calculate forecasts
    const now = new Date()
    const forecast30 = calculateForecast(recurringInvoices || [], outstandingInvoices || [], historicalInvoices || [], now, 30)
    const forecast60 = calculateForecast(recurringInvoices || [], outstandingInvoices || [], historicalInvoices || [], now, 60)
    const forecast90 = calculateForecast(recurringInvoices || [], outstandingInvoices || [], historicalInvoices || [], now, 90)

    console.log('[RevenueForecast] Generated forecasts for user', userId)

    return NextResponse.json({
      period_30_days: forecast30,
      period_60_days: forecast60,
      period_90_days: forecast90,
      generated_at: now.toISOString()
    })
  } catch (err) {
    console.error('[RevenueForecast] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateForecast(
  recurringInvoices: any[],
  outstandingInvoices: any[],
  historicalInvoices: any[],
  now: Date,
  daysAhead: number
) {
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + daysAhead)

  let forecast = 0
  const breakdown: any = {
    recurring: 0,
    outstanding: 0,
    trend: 0
  }

  // 1. Recurring invoices projection
  recurringInvoices?.forEach((rec: any) => {
    const occurrences = getOccurrencesInRange(rec.frequency, now, endDate)
    const amount = occurrences * rec.amount
    breakdown.recurring += amount
    forecast += amount
  })

  // 2. Outstanding invoices expected to be paid
  outstandingInvoices?.forEach((inv: any) => {
    if (inv.due_date) {
      const dueDate = new Date(inv.due_date)
      if (dueDate <= endDate && dueDate >= now) {
        // Assume 80% payment rate for outstanding invoices
        const expectedPayment = inv.remaining_balance * 0.8
        breakdown.outstanding += expectedPayment
        forecast += expectedPayment
      }
    }
  })

  // 3. Trend projection (historical average)
  if (historicalInvoices && historicalInvoices.length > 0) {
    const totalHistorical = historicalInvoices.reduce((sum, inv) => sum + inv.amount, 0)
    const daysInHistorical = 180 // 6 months
    const avgPerDay = totalHistorical / daysInHistorical
    const trendProjection = avgPerDay * daysAhead
    breakdown.trend = trendProjection
    forecast += trendProjection
  }

  return {
    total: Math.round(forecast * 100) / 100,
    breakdown,
    confidence: calculateConfidence(recurringInvoices, outstandingInvoices, historicalInvoices),
    notes: generateForecastNotes(breakdown, daysAhead)
  }
}

function getOccurrencesInRange(frequency: string, start: Date, end: Date): number {
  const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  switch (frequency) {
    case 'weekly':
      return Math.floor(daysDiff / 7)
    case 'biweekly':
      return Math.floor(daysDiff / 14)
    case 'monthly':
      return Math.floor(daysDiff / 30)
    case 'quarterly':
      return Math.floor(daysDiff / 90)
    case 'yearly':
      return Math.floor(daysDiff / 365)
    default:
      return 0
  }
}

function calculateConfidence(
  recurringInvoices: any[],
  outstandingInvoices: any[],
  historicalInvoices: any[]
): string {
  let score = 0

  // Strong confidence: recurring invoices
  if (recurringInvoices && recurringInvoices.length >= 3) {
    score += 40
  } else if (recurringInvoices && recurringInvoices.length > 0) {
    score += 20
  }

  // Medium confidence: outstanding invoices
  if (outstandingInvoices && outstandingInvoices.length > 0) {
    score += 20
  }

  // Strong confidence: historical data
  if (historicalInvoices && historicalInvoices.length >= 10) {
    score += 40
  } else if (historicalInvoices && historicalInvoices.length >= 5) {
    score += 20
  }

  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

function generateForecastNotes(breakdown: any, daysAhead: number): string[] {
  const notes: string[] = []

  if (breakdown.recurring > 0) {
    notes.push(`Recurring invoices: $${breakdown.recurring.toLocaleString()}`)
  }

  if (breakdown.outstanding > 0) {
    notes.push(`Expected payments from outstanding: $${breakdown.outstanding.toLocaleString()} (80% collection rate assumed)`)
  }

  if (breakdown.trend > 0) {
    notes.push(`Trend-based projection: $${breakdown.trend.toLocaleString()} (based on 6-month average)`)
  }

  if (notes.length === 0) {
    notes.push('No historical data available for this period')
  }

  return notes
}
