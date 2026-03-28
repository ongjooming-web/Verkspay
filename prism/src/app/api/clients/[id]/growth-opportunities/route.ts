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
      .select('id, name, email, company, phone, created_at, total_outstanding, last_invoice_date, total_revenue')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Check plan gating - Growth Opportunities is Enterprise-only
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, ai_lead_insights_count, ai_lead_insights_reset_date')
      .eq('id', userId)
      .single()

    const plan = profile?.plan || 'trial'
    const masterTestEmails = (process.env.MASTER_TEST_EMAILS || '').split(',')
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const isMasterTest = masterTestEmails.includes(userData?.user?.email || '')

    // Plan gating - Enterprise only
    if (!isMasterTest && plan !== 'enterprise') {
      return NextResponse.json(
        { error: 'Growth Opportunities require Enterprise plan', upgrade: true },
        { status: 403 }
      )
    }

    // Rate limiting for Enterprise
    let count = profile?.ai_lead_insights_count || 0

    // Reset counter if 30 days have passed
    if (profile?.ai_lead_insights_reset_date) {
      const resetDate = new Date(profile.ai_lead_insights_reset_date)
      const now = new Date()
      const daysSinceReset = Math.floor((now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysSinceReset > 30) {
        count = 0
        await supabase
          .from('profiles')
          .update({ ai_lead_insights_count: 0, ai_lead_insights_reset_date: now.toISOString() })
          .eq('id', userId)
      }
    }

    if (!isMasterTest && count >= 30) {
      return NextResponse.json(
        { error: 'Growth Opportunities limit (30/month) reached', upgrade: true },
        { status: 429 }
      )
    }

    // Aggregate client data for growth analysis
    const { data: invoices } = await supabase
      .from('invoices')
      .select('amount, amount_paid, status, created_at')
      .eq('client_id', clientId)

    const { data: proposals } = await supabase
      .from('proposals')
      .select('total_amount, status, created_at')
      .eq('client_id', clientId)

    const { data: recurringInvoices } = await supabase
      .from('recurring_invoices')
      .select('amount, frequency, status')
      .eq('client_id', clientId)

    const { data: tags } = await supabase
      .from('client_tag_assignments')
      .select('client_tags(name, is_auto)')
      .eq('client_id', clientId)

    // Calculate metrics for growth analysis
    const clientAgeDays = Math.floor(
      (new Date().getTime() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    const daysSinceLastInvoice = client.last_invoice_date
      ? Math.floor((new Date().getTime() - new Date(client.last_invoice_date).getTime()) / (1000 * 60 * 60 * 24))
      : null

    const totalBilled = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0
    const totalPaid = invoices?.reduce((sum, inv) => sum + inv.amount_paid, 0) || 0
    const invoiceCount = invoices?.length || 0

    // Revenue trend (last 3 months)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const recentInvoices = invoices?.filter((inv) => new Date(inv.created_at) > threeMonthsAgo) || []
    const recentRevenue = recentInvoices.reduce((sum, inv) => sum + inv.amount, 0)
    const monthlyAverage = recentRevenue / 3

    // Proposal analysis
    const proposalCount = proposals?.length || 0
    const proposalsAccepted = proposals?.filter((p) => p.status === 'accepted').length || 0
    const proposalsDeclined = proposals?.filter((p) => p.status === 'declined').length || 0
    const winRate = proposalCount > 0 ? Math.round((proposalsAccepted / proposalCount) * 100) : 0

    // Recurring revenue
    const activeRecurring = recurringInvoices?.filter((r) => r.status === 'active') || []
    const recurringTotal = activeRecurring.reduce((sum, r) => sum + r.amount, 0)

    // Engagement score (0-100)
    let engagementScore = 0
    if (invoiceCount >= 10) engagementScore += 30
    else if (invoiceCount >= 5) engagementScore += 20
    else if (invoiceCount > 0) engagementScore += 10

    if (activeRecurring.length > 0) engagementScore += 25
    if (proposalCount > 0) engagementScore += 20
    if (daysSinceLastInvoice && daysSinceLastInvoice < 30) engagementScore += 15
    if (winRate > 80) engagementScore += 10

    const tagNames = tags?.map((t: any) => `${t.client_tags.name}${t.client_tags.is_auto ? ' (auto)' : ''}`) || []

    const systemPrompt = `You are a business growth analyst for Prism. Analyze client data and identify specific, actionable growth opportunities and upsell candidates.

Format your response EXACTLY as follows:

## Engagement & Relationship Health
One paragraph assessing the overall health and engagement level of this client relationship.

## Growth Opportunities
- 2-3 specific expansion opportunities based on their business pattern
- Include concrete next steps for each opportunity

## Upsell Candidates
- 1-3 service/product recommendations to increase value per client
- Justify each recommendation with data

## Risk Factors
- 1-2 risks or red flags to watch for with this client
- Suggested mitigation strategies

## 90-Day Action Plan
- 3-4 specific actions to take in the next 90 days to maximize revenue and engagement
- Prioritized by impact and effort`

    const userPrompt = `Client: ${client.name}${client.company ? ` (${client.company})` : ''}
Client Age: ${clientAgeDays} days
Current Tags: ${tagNames.length > 0 ? tagNames.join(', ') : 'None'}

Revenue Profile:
- Total billed: $${totalBilled.toLocaleString()}
- Total paid: $${totalPaid.toLocaleString()}
- Outstanding: $${(client.total_outstanding || 0).toLocaleString()}
- Total invoices: ${invoiceCount}
- Monthly average (last 3 months): $${monthlyAverage.toLocaleString()}
- Last invoice: ${daysSinceLastInvoice ? daysSinceLastInvoice + ' days ago' : 'Never'}

Active Recurring Revenue:
- Count: ${activeRecurring.length}
- Total per period: $${recurringTotal.toLocaleString()}

Proposal Performance:
- Sent: ${proposalCount}, Accepted: ${proposalsAccepted}, Declined: ${proposalsDeclined}
- Win rate: ${winRate}%

Engagement Score: ${engagementScore}/100
- (Based on frequency, recency, recurring revenue, and proposal success)`

    // Call Claude Haiku
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const opportunities = response.content[0].type === 'text' ? response.content[0].text : ''

    // Save to database
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        ai_lead_insights: opportunities,
        ai_lead_insights_generated_at: new Date().toISOString()
      })
      .eq('id', clientId)

    if (updateError) {
      console.error('[GrowthOpportunities] Error saving insights:', updateError)
    }

    // Increment usage counter (if not master test)
    if (!isMasterTest) {
      const newCount = (profile?.ai_lead_insights_count || 0) + 1
      await supabase
        .from('profiles')
        .update({ ai_lead_insights_count: newCount })
        .eq('id', userId)
    }

    console.log('[GrowthOpportunities] Generated growth opportunities for client', clientId)

    return NextResponse.json({
      opportunities,
      engagement_score: engagementScore,
      monthly_average: monthlyAverage,
      generated_at: new Date().toISOString()
    })
  } catch (err) {
    console.error('[GrowthOpportunities] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
