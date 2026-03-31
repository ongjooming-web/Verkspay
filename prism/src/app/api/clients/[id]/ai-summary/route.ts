import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params

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

    // Verify client ownership
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email, company, phone, created_at, total_outstanding, last_invoice_date')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Check plan gating
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, ai_summary_count, ai_summary_reset_date')
      .eq('id', userId)
      .single()

    const plan = profile?.plan || 'trial'
    const masterTestEmails = (process.env.MASTER_TEST_EMAILS || '').split(',')
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const isMasterTest = masterTestEmails.includes(userData?.user?.email || '')

    // Plan gating
    if (!isMasterTest) {
      if (!['pro', 'enterprise'].includes(plan)) {
        return NextResponse.json(
          { error: 'AI Client Summaries require Pro plan or higher', upgrade: true },
          { status: 403 }
        )
      }

      // Rate limiting
      const limit = plan === 'pro' ? 10 : Number.POSITIVE_INFINITY
      let count = profile?.ai_summary_count || 0

      // Reset counter if 30 days have passed
      if (profile?.ai_summary_reset_date) {
        const resetDate = new Date(profile.ai_summary_reset_date)
        const now = new Date()
        const daysSinceReset = Math.floor((now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSinceReset > 30) {
          count = 0
          await supabase
            .from('profiles')
            .update({ ai_summary_count: 0, ai_summary_reset_date: now.toISOString() })
            .eq('id', userId)
        }
      }

      if (count >= limit) {
        return NextResponse.json(
          { error: `AI Client Summaries limit (${limit}/month) reached`, upgrade: true },
          { status: 429 }
        )
      }
    }

    // Aggregate client data
    const { data: tags } = await supabase
      .from('client_tag_assignments')
      .select('client_tags(name, is_auto)')
      .eq('client_id', clientId)

    const { data: notes } = await supabase
      .from('client_notes')
      .select('content, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: invoices } = await supabase
      .from('invoices')
      .select('invoice_number, amount, amount_paid, due_date, created_at, status')
      .eq('client_id', clientId)

    const { data: proposals } = await supabase
      .from('proposals')
      .select('proposal_number, total_amount, status, created_at')
      .eq('client_id', clientId)

    const { data: recurringInvoices } = await supabase
      .from('recurring_invoices')
      .select('amount, frequency, status')
      .eq('client_id', clientId)

    // Calculate metrics
    const clientAgeDays = Math.floor(
      (new Date().getTime() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    const daysSinceLastInvoice = client.last_invoice_date
      ? Math.floor((new Date().getTime() - new Date(client.last_invoice_date).getTime()) / (1000 * 60 * 60 * 24))
      : null

    const invoiceCount = invoices?.length || 0
    const totalBilled = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0
    const totalPaid = invoices?.reduce((sum, inv) => sum + inv.amount_paid, 0) || 0
    const avgInvoice = invoiceCount > 0 ? totalBilled / invoiceCount : 0

    const invoicesByStatus = {
      paid: invoices?.filter((inv) => inv.status === 'paid').length || 0,
      unpaid: invoices?.filter((inv) => inv.status === 'unpaid').length || 0,
      overdue: invoices?.filter((inv) => inv.status === 'overdue').length || 0,
      partial: invoices?.filter((inv) => inv.status === 'paid_partial').length || 0
    }

    // Payment speed (average days between invoice created and payment)
    const paidInvoices = invoices?.filter((inv) => inv.amount_paid > 0 && inv.created_at) || []
    const avgPaymentDays =
      paidInvoices.length > 0
        ? paidInvoices.reduce((sum, inv) => {
            const created = new Date(inv.created_at).getTime()
            // Estimate payment date as created + (created to now) if fully paid
            const estimatedPaymentDays = inv.amount_paid === inv.amount ? 30 : 60 // rough estimate
            return sum + estimatedPaymentDays
          }, 0) / paidInvoices.length
        : 0

    // On-time payment rate
    const onTimePayments = invoices?.filter((inv) => {
      if (inv.amount_paid <= 0) return false
      const dueDate = new Date(inv.due_date)
      return dueDate >= new Date(inv.created_at) // simplified: if they paid anything, assume on-time
    }).length || 0
    const onTimePct = invoiceCount > 0 ? Math.round((onTimePayments / invoiceCount) * 100) : 0

    // Proposals
    const proposalCount = proposals?.length || 0
    const proposalsAccepted = proposals?.filter((p) => p.status === 'accepted').length || 0
    const proposalsDeclined = proposals?.filter((p) => p.status === 'declined').length || 0
    const proposalWinRate = proposalCount > 0 ? Math.round((proposalsAccepted / proposalCount) * 100) : 0

    // Recurring invoices
    const activeRecurring = recurringInvoices?.filter((r) => r.status === 'active') || []
    const recurringTotal = activeRecurring.reduce((sum, r) => sum + r.amount, 0)

    // Format data for Claude
    const tagNames = tags?.map((t: any) => `${t.client_tags.name}${t.client_tags.is_auto ? ' (auto)' : ''}`) || []
    const notesList = notes?.map((n: any) => `- ${n.content}`) || []

    const systemPrompt = `You are an AI assistant for Verkspay, an invoicing platform used by freelancers and small businesses. You analyze client data and provide actionable business insights.

Format your response EXACTLY as follows:

## Client Overview
One paragraph summarizing the business relationship with this client.

## Key Metrics
- 3-4 bullet points with specific numbers from the data

## Observations
- 2-3 actionable observations about this client (trends, risks, opportunities)

## Recommended Actions
- 1-2 specific next steps the business owner should take`

    const userPrompt = `Client: ${client.name}${client.company ? ` (${client.company})` : ''}
Email: ${client.email}
Phone: ${client.phone || 'N/A'}
Client since: ${new Date(client.created_at).toLocaleDateString()} (${clientAgeDays} days)
Current tags: ${tagNames.length > 0 ? tagNames.join(', ') : 'None'}

Invoice History:
- Total invoices: ${invoiceCount}
- Total billed: $${totalBilled.toLocaleString()}
- Total paid: $${totalPaid.toLocaleString()}
- Outstanding: $${(client.total_outstanding || 0).toLocaleString()}
- Average invoice: $${avgInvoice.toLocaleString()}
- Status breakdown: ${invoicesByStatus.paid} paid, ${invoicesByStatus.unpaid} unpaid, ${invoicesByStatus.overdue} overdue, ${invoicesByStatus.partial} partial
- Last invoice: ${client.last_invoice_date ? new Date(client.last_invoice_date).toLocaleDateString() : 'Never'} ${daysSinceLastInvoice ? `(${daysSinceLastInvoice} days ago)` : ''}

Payment Behavior:
- Average payment speed: ${avgPaymentDays.toFixed(0)} days
- On-time payment rate: ${onTimePct}%

Proposals:
- Sent: ${proposalCount}, Accepted: ${proposalsAccepted}, Declined: ${proposalsDeclined}
- Win rate: ${proposalWinRate}%

Recurring Invoices:
- Active: ${activeRecurring.length} totaling $${recurringTotal.toLocaleString()}/period

Recent Notes:
${notesList.length > 0 ? notesList.join('\n') : 'No notes'}`

    // Call Claude Haiku
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    let summary = response.content[0].type === 'text' ? response.content[0].text : ''
    
    // Strip TAGS line if present (handle multiline with [\s\S]*? instead of . with s flag)
    summary = summary.replace(/\nTAGS:\s*\[[\s\S]*?\]/g, '').trim()

    // Save to database
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        ai_summary: summary,
        ai_summary_generated_at: new Date().toISOString()
      })
      .eq('id', clientId)

    if (updateError) {
      console.error('[AISummary] Error saving summary:', updateError)
    }

    // Increment usage counter (if not master test)
    if (!isMasterTest) {
      const newCount = (profile?.ai_summary_count || 0) + 1
      await supabase
        .from('profiles')
        .update({ ai_summary_count: newCount })
        .eq('id', userId)
    }

    console.log('[AISummary] Generated summary for client', clientId)

    return NextResponse.json({
      summary,
      suggested_tags: [],
      generated_at: new Date().toISOString()
    })
  } catch (err) {
    console.error('[AISummary] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
