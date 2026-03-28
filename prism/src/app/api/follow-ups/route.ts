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
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, client_id, amount, due_date, invoice_number')
        .eq('user_id', userId)
        .eq('status', 'overdue')

      const suggestions: any[] = []
      const invoicesByClient = new Map<string, any[]>()

      invoices?.forEach((inv: any) => {
        if (!invoicesByClient.has(inv.client_id)) {
          invoicesByClient.set(inv.client_id, [])
        }
        invoicesByClient.get(inv.client_id)!.push(inv)
      })

      for (const [clientId, clientInvoices] of invoicesByClient) {
        const dueDate = new Date(clientInvoices[0].due_date)
        const now = new Date()
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysOverdue >= 3) {
          const totalAmount = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0)
          suggestions.push({
            client_id: clientId,
            reason: 'overdue_invoices',
            priority: 'high',
            data: {
              count: clientInvoices.length,
              amount: totalAmount,
              daysOverdue
            }
          })
        }
      }

      return suggestions
    }
  },
  {
    id: 'inactive_client',
    name: 'Inactive Client',
    priority: 'medium',
    condition: async (supabase: any, userId: string) => {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, last_invoice_date, invoice_count')
        .eq('user_id', userId)

      const suggestions: any[] = []
      const now = new Date()

      clients?.forEach((client: any) => {
        if (client.invoice_count >= 3 && client.last_invoice_date) {
          const lastInvoiceDate = new Date(client.last_invoice_date)
          const daysSince = Math.floor((now.getTime() - lastInvoiceDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysSince >= 45) {
            suggestions.push({
              client_id: client.id,
              reason: 'inactive_client',
              priority: 'medium',
              data: {
                daysSince,
                invoiceCount: client.invoice_count
              }
            })
          }
        }
      })

      return suggestions
    }
  },
  {
    id: 'paused_recurring',
    name: 'Paused Recurring',
    priority: 'medium',
    condition: async (supabase: any, userId: string) => {
      const { data: recurring } = await supabase
        .from('recurring_invoices')
        .select('id, client_id, recurring_number, updated_at')
        .eq('user_id', userId)
        .eq('status', 'paused')

      const suggestions: any[] = []
      const now = new Date()

      recurring?.forEach((rec: any) => {
        const pausedDate = new Date(rec.updated_at)
        const daysPaused = Math.floor((now.getTime() - pausedDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysPaused >= 30) {
          suggestions.push({
            client_id: rec.client_id,
            reason: 'paused_recurring',
            priority: 'medium',
            data: {
              recurringNumber: rec.recurring_number,
              daysPaused
            }
          })
        }
      })

      return suggestions
    }
  },
  {
    id: 'pending_proposal',
    name: 'Pending Proposal',
    priority: 'medium',
    condition: async (supabase: any, userId: string) => {
      const { data: proposals } = await supabase
        .from('proposals')
        .select('id, client_id, proposal_number, total_amount, created_at')
        .eq('user_id', userId)
        .eq('status', 'sent')

      const suggestions: any[] = []
      const now = new Date()

      proposals?.forEach((prop: any) => {
        const createdDate = new Date(prop.created_at)
        const daysPending = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysPending >= 7) {
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
        }
      })

      return suggestions
    }
  },
  {
    id: 'new_no_invoices',
    name: 'New Client (No Invoices)',
    priority: 'low',
    condition: async (supabase: any, userId: string) => {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, created_at, invoice_count')
        .eq('user_id', userId)

      const suggestions: any[] = []
      const now = new Date()

      clients?.forEach((client: any) => {
        if (client.invoice_count === 0) {
          const createdDate = new Date(client.created_at)
          const daysSince = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysSince >= 7) {
            suggestions.push({
              client_id: client.id,
              reason: 'new_no_invoices',
              priority: 'low',
              data: {
                daysSince
              }
            })
          }
        }
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

      const suggestions: any[] = []

      clients?.forEach((client: any) => {
        if (client.total_outstanding > 0) {
          const total = client.total_outstanding + client.total_revenue
          const percentage = (client.total_outstanding / total) * 100

          if (percentage > 50) {
            suggestions.push({
              client_id: client.id,
              reason: 'high_outstanding',
              priority: 'low',
              data: {
                outstanding: client.total_outstanding,
                percentage: Math.round(percentage)
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

    // Check plan gating
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single()

    const plan = profile?.plan || 'trial'
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

    // Generate suggestions from all rules
    let allSuggestions: any[] = []
    for (const rule of FOLLOW_UP_RULES) {
      const ruleSuggestions = await rule.condition(supabase, userId)
      allSuggestions = allSuggestions.concat(ruleSuggestions)
    }

    // Get existing pending follow-ups to avoid duplicates
    const { data: existingFollowUps } = await supabase
      .from('client_follow_ups')
      .select('client_id, reason')
      .eq('user_id', userId)
      .eq('status', 'pending')

    const existingKeys = new Set(
      existingFollowUps?.map((fu) => `${fu.client_id}:${fu.reason}`) || []
    )

    // Filter out duplicates and get client names
    const uniqueSuggestions = allSuggestions.filter(
      (s) => !existingKeys.has(`${s.client_id}:${s.reason}`)
    )

    // Get client names
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', userId)

    const clientMap = new Map(clients?.map((c) => [c.id, c.name]) || [])

    // Upsert follow-ups
    const followUpsToInsert = uniqueSuggestions.map((s) => ({
      user_id: userId,
      client_id: s.client_id,
      reason: s.reason,
      priority: s.priority,
      status: 'pending',
      suggestion: generateSuggestionText(s, clientMap.get(s.client_id) || 'Unknown'),
      data: s.data
    }))

    if (followUpsToInsert.length > 0) {
      await supabase.from('client_follow_ups').insert(followUpsToInsert)
      console.log('[FollowUps] Created', followUpsToInsert.length, 'new suggestions')
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

function generateSuggestionText(suggestion: any, clientName: string): string {
  const { reason, data } = suggestion

  switch (reason) {
    case 'overdue_invoices':
      return `${clientName} has ${data.count} overdue invoice(s) totaling $${data.amount.toLocaleString()}. Consider sending a reminder.`
    case 'inactive_client':
      return `You haven't invoiced ${clientName} in ${data.daysSince} days. They previously had ${data.invoiceCount} invoices with you.`
    case 'paused_recurring':
      return `Recurring invoice ${data.recurringNumber} for ${clientName} has been paused for ${data.daysPaused} days.`
    case 'pending_proposal':
      return `Proposal ${data.proposalNumber} for ${clientName} ($${data.amount.toLocaleString()}) has been pending for ${data.daysPending} days. Consider following up.`
    case 'new_no_invoices':
      return `${clientName} was added ${data.daysSince} days ago but has no invoices yet.`
    case 'high_outstanding':
      return `${clientName} has $${data.outstanding.toLocaleString()} outstanding (${data.percentage}% of total billings). Review their payment status.`
    default:
      return 'Follow up with this client.'
  }
}
