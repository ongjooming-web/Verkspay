import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Follow-up suggestion rules
const FOLLOW_UP_RULES = [
  {
    id: 'overdue_invoices',
    name: 'Overdue Invoices',
    priority: 'high',
    condition: async (supabase: any, userId: string) => {
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, client_id, remaining_balance, due_date, invoice_number, currency_code, status')
        .eq('user_id', userId)
        .in('status', ['overdue', 'unpaid'])

      const suggestions: any[] = []
      const invoicesByClient = new Map<string, any[]>()

      invoices?.forEach((inv: any) => {
        const dueDate = new Date(inv.due_date)
        // Include if status is overdue OR (unpaid AND due_date is 3+ days ago)
        if (inv.status === 'overdue' || (inv.status === 'unpaid' && dueDate < threeDaysAgo)) {
          if (!invoicesByClient.has(inv.client_id)) {
            invoicesByClient.set(inv.client_id, [])
          }
          invoicesByClient.get(inv.client_id)!.push(inv)
        }
      })

      for (const [clientId, clientInvoices] of invoicesByClient) {
        const totalRemaining = clientInvoices.reduce((sum, inv) => sum + (inv.remaining_balance || 0), 0)
        const currency = clientInvoices[0].currency_code || 'USD'
        
        suggestions.push({
          client_id: clientId,
          reason: 'overdue_invoices',
          priority: 'high',
          data: {
            count: clientInvoices.length,
            totalRemaining,
            currency
          }
        })
      }

      return suggestions
    }
  },
  {
    id: 'inactive_client',
    name: 'Inactive Client',
    priority: 'medium',
    condition: async (supabase: any, userId: string) => {
      const now = new Date()
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, last_invoice_date, invoice_count')
        .eq('user_id', userId)
        .gte('invoice_count', 3)
        .not('last_invoice_date', 'is', null)
        .lt('last_invoice_date', sixtyDaysAgo.toISOString())

      const suggestions: any[] = []

      clients?.forEach((client: any) => {
        const lastInvoiceDate = new Date(client.last_invoice_date)
        const daysSince = Math.floor((now.getTime() - lastInvoiceDate.getTime()) / (1000 * 60 * 60 * 24))

        suggestions.push({
          client_id: client.id,
          reason: 'inactive_client',
          priority: 'medium',
          data: {
            daysSince,
            invoiceCount: client.invoice_count
          }
        })
      })

      return suggestions
    }
  },
  {
    id: 'paused_recurring',
    name: 'Paused Recurring',
    priority: 'medium',
    condition: async (supabase: any, userId: string) => {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const { data: recurring } = await supabase
        .from('recurring_invoices')
        .select('id, client_id, description, updated_at')
        .eq('user_id', userId)
        .eq('status', 'paused')
        .lt('updated_at', thirtyDaysAgo.toISOString())

      const suggestions: any[] = []

      recurring?.forEach((rec: any) => {
        const pausedDate = new Date(rec.updated_at)
        const daysPaused = Math.floor((now.getTime() - pausedDate.getTime()) / (1000 * 60 * 60 * 24))

        suggestions.push({
          client_id: rec.client_id,
          reason: 'paused_recurring',
          priority: 'medium',
          data: {
            description: rec.description || 'Recurring invoice',
            daysPaused
          }
        })
      })

      return suggestions
    }
  },
  {
    id: 'pending_proposal',
    name: 'Pending Proposal',
    priority: 'medium',
    condition: async (supabase: any, userId: string) => {
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const { data: proposals } = await supabase
        .from('proposals')
        .select('id, client_id, proposal_number, total_amount, created_at')
        .eq('user_id', userId)
        .eq('status', 'sent')
        .lt('created_at', sevenDaysAgo.toISOString())

      const suggestions: any[] = []

      proposals?.forEach((prop: any) => {
        const createdDate = new Date(prop.created_at)
        const daysPending = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

        suggestions.push({
          client_id: prop.client_id,
          reason: 'pending_proposal',
          priority: 'medium',
          data: {
            proposalNumber: prop.proposal_number,
            amount: prop.total_amount,
            daysPending
          }
        })
      })

      return suggestions
    }
  },
  {
    id: 'new_no_invoices',
    name: 'New Client (No Invoices)',
    priority: 'low',
    condition: async (supabase: any, userId: string) => {
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, created_at, invoice_count')
        .eq('user_id', userId)
        .eq('invoice_count', 0)
        .lt('created_at', sevenDaysAgo.toISOString())

      const suggestions: any[] = []

      clients?.forEach((client: any) => {
        const createdDate = new Date(client.created_at)
        const daysSince = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

        suggestions.push({
          client_id: client.id,
          reason: 'new_no_invoices',
          priority: 'low',
          data: {
            daysSince
          }
        })
      })

      return suggestions
    }
  },
  {
    id: 'high_outstanding',
    name: 'High Outstanding',
    priority: 'low',
    condition: async (supabase: any, userId: string) => {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, total_outstanding, total_revenue')
        .eq('user_id', userId)
        .gt('total_outstanding', 0)

      const suggestions: any[] = []

      clients?.forEach((client: any) => {
        const totalBillings = client.total_outstanding + client.total_revenue
        if (totalBillings > 0) {
          const outstandingPct = (client.total_outstanding / totalBillings) * 100

          if (outstandingPct > 30) {
            suggestions.push({
              client_id: client.id,
              reason: 'high_outstanding',
              priority: 'low',
              data: {
                outstanding: client.total_outstanding,
                percentage: Math.round(outstandingPct)
              }
            })
          }
        }
      })

      return suggestions
    }
  }
]

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

    // Check plan gating and fetch currency
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, currency_code')
      .eq('id', userId)
      .single()

    const plan = profile?.plan || 'trial'
    const currencyCode = profile?.currency_code || 'USD'
    const allowedPlans = ['pro', 'enterprise']

    // Master test account bypass
    const masterTestEmails = (process.env.MASTER_TEST_EMAILS || '').split(',')
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const isMasterTest = masterTestEmails.includes(userData?.user?.email || '')

    if (!isMasterTest && !allowedPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Follow-up suggestions require Pro plan or higher', upgrade: true },
        { status: 403 }
      )
    }

    // Get client names
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', userId)

    const clientMap = new Map(clients?.map((c) => [c.id, c.name]) || [])

    // Generate suggestions from all rules
    const allSuggestions: any[] = []
    const ruleResults = new Map<string, number>()

    for (const rule of FOLLOW_UP_RULES) {
      const ruleSuggestions = await rule.condition(supabase, userId)
      ruleResults.set(rule.id, ruleSuggestions.length)
      console.log(`[FollowUps] Rule ${rule.id}: ${ruleSuggestions.length} matches`)
      allSuggestions.push(...ruleSuggestions)
    }

    // Get existing pending follow-ups for deduplication and cleanup
    const { data: existingFollowUps } = await supabase
      .from('client_follow_ups')
      .select('id, client_id, reason, status')
      .eq('user_id', userId)
      .eq('status', 'pending')

    // Create set of currently matching suggestions (client_id + reason)
    const currentMatches = new Set(
      allSuggestions.map((s) => `${s.client_id}:${s.reason}`)
    )

    // Insert new suggestions that don't already exist as pending
    const existingKeys = new Set(
      existingFollowUps?.map((fu) => `${fu.client_id}:${fu.reason}`) || []
    )

    const uniqueSuggestions = allSuggestions.filter(
      (s) => !existingKeys.has(`${s.client_id}:${s.reason}`)
    )

    const followUpsToInsert = uniqueSuggestions.map((s) => ({
      user_id: userId,
      client_id: s.client_id,
      reason: s.reason,
      priority: s.priority,
      status: 'pending',
      suggestion: generateSuggestionText(s, clientMap.get(s.client_id) || 'Unknown', currencyCode),
      created_at: new Date().toISOString()
    }))

    if (followUpsToInsert.length > 0) {
      await supabase.from('client_follow_ups').insert(followUpsToInsert)
      console.log('[FollowUps] Created', followUpsToInsert.length, 'new suggestions')
    }

    // Dismiss pending follow-ups whose rules NO LONGER match
    const followUpsToCleanup = existingFollowUps?.filter(
      (fu) => !currentMatches.has(`${fu.client_id}:${fu.reason}`)
    ) || []

    if (followUpsToCleanup.length > 0) {
      const idsToUpdate = followUpsToCleanup.map((fu) => fu.id)
      await supabase
        .from('client_follow_ups')
        .update({ status: 'dismissed' })
        .in('id', idsToUpdate)
      console.log('[FollowUps] Dismissed', followUpsToCleanup.length, 'stale suggestions')
    }

    // Return all pending follow-ups sorted by priority
    const { data: allFollowUps } = await supabase
      .from('client_follow_ups')
      .select('id, client_id, reason, suggestion, priority, created_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    const followUpsWithNames = allFollowUps?.map((fu) => ({
      ...fu,
      client_name: clientMap.get(fu.client_id) || 'Unknown'
    })) || []

    return NextResponse.json({
      follow_ups: followUpsWithNames
    })
  } catch (err) {
    console.error('[FollowUps] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateSuggestionText(suggestion: any, clientName: string, userCurrency: string): string {
  const { reason, data } = suggestion
  const formatCurrency = (amount: number) => {
    const symbol = userCurrency === 'MYR' ? 'RM' : '$'
    return `${symbol}${amount.toLocaleString()}`
  }

  switch (reason) {
    case 'overdue_invoices':
      return `${clientName} has ${data.count} overdue invoice(s) totaling ${formatCurrency(data.totalRemaining)}. Consider sending a reminder.`
    case 'inactive_client':
      return `You haven't invoiced ${clientName} in ${data.daysSince} days. They previously had ${data.invoiceCount} invoices with you.`
    case 'paused_recurring':
      return `Recurring invoice for ${clientName} (${data.description}) has been paused for ${data.daysPaused} days.`
    case 'pending_proposal':
      return `Proposal ${data.proposalNumber} for ${clientName} has been pending for ${data.daysPending} days. Consider following up.`
    case 'new_no_invoices':
      return `${clientName} was added ${data.daysSince} days ago but has no invoices yet.`
    case 'high_outstanding':
      return `${clientName} has outstanding balance (${data.percentage}% of total billings). Review their payment status.`
    default:
      return 'Follow up with this client.'
  }
}
