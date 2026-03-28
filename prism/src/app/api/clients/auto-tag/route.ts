import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Auto-tagging business rules
const AUTO_TAG_RULES = [
  {
    id: 'vip',
    name: 'VIP',
    condition: (stats: any) => stats.total_revenue > 50000, // >$50k revenue
    reason: 'High-value client (>$50k revenue)'
  },
  {
    id: 'high_value',
    name: 'High Value',
    condition: (stats: any) => stats.total_revenue > 20000 && stats.total_revenue <= 50000,
    reason: 'Significant revenue contributor ($20k-$50k)'
  },
  {
    id: 'recurring',
    name: 'Recurring',
    condition: (stats: any) => stats.invoice_count >= 5 && stats.last_invoice_date,
    reason: '5+ invoices (recurring client)'
  },
  {
    id: 'late_payer',
    name: 'Late Payer',
    condition: (stats: any) => stats.total_outstanding > 0 && stats.days_overdue > 30,
    reason: 'Payment overdue by 30+ days'
  },
  {
    id: 'at_risk',
    name: 'At Risk',
    condition: (stats: any) => stats.total_outstanding > stats.total_revenue * 0.3, // 30% of revenue outstanding
    reason: 'High outstanding balance relative to revenue'
  },
  {
    id: 'inactive',
    name: 'Inactive',
    condition: (stats: any) => {
      if (!stats.last_invoice_date) return false
      const lastInvoiceDate = new Date(stats.last_invoice_date)
      const now = new Date()
      const daysSince = Math.floor((now.getTime() - lastInvoiceDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysSince > 90 // No invoice in 90+ days
    },
    reason: 'No activity in 90+ days'
  }
]

export async function POST(request: NextRequest) {
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

    // Get all clients with their stats
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        total_revenue,
        total_outstanding,
        last_invoice_date,
        invoice_count,
        client_tag_assignments(tag_id)
      `)
      .eq('user_id', userId)

    if (clientsError || !clients) {
      console.error('[AutoTag] Error fetching clients:', clientsError)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    // Get all system tags for this user
    const { data: systemTags, error: tagsError } = await supabase
      .from('client_tags')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_system', true)

    if (tagsError) {
      console.error('[AutoTag] Error fetching system tags:', tagsError)
      return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
    }

    // Create a map of tag names to IDs
    const tagMap = new Map(systemTags?.map((t: any) => [t.name, t.id]) || [])

    // Process each client
    let autoTagged = 0
    const results: any[] = []

    for (const client of clients) {
      // Calculate days overdue for late payer check
      let daysOverdue = 0
      if (client.last_invoice_date && client.total_outstanding > 0) {
        const lastInvoiceDate = new Date(client.last_invoice_date)
        const now = new Date()
        daysOverdue = Math.floor((now.getTime() - lastInvoiceDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      const stats = {
        ...client,
        days_overdue: daysOverdue
      }

      // Evaluate each rule
      const rulesToApply: any[] = []
      for (const rule of AUTO_TAG_RULES) {
        if (rule.condition(stats)) {
          rulesToApply.push(rule)
        }
      }

      // Apply tags (remove old auto-tags, add new ones)
      const currentTagIds = client.client_tag_assignments?.map((a: any) => a.tag_id) || []

      for (const rule of rulesToApply) {
        const tagId = tagMap.get(rule.name)
        if (tagId && !currentTagIds.includes(tagId)) {
          // Insert new auto-tag assignment
          const { error: assignError } = await supabase
            .from('client_tag_assignments')
            .insert({
              client_id: client.id,
              tag_id: tagId,
              is_auto: true
            })

          if (!assignError) {
            autoTagged++
            results.push({
              client_id: client.id,
              client_name: client.name,
              tag: rule.name,
              reason: rule.reason
            })
          }
        }
      }

      // Update auto_tags_calculated_at timestamp
      const { error: updateError } = await supabase
        .from('clients')
        .update({ auto_tags_calculated_at: new Date().toISOString() })
        .eq('id', client.id)

      if (updateError) {
        console.error('[AutoTag] Error updating client timestamp:', updateError)
      }
    }

    console.log('[AutoTag] Auto-tagged', autoTagged, 'clients')

    return NextResponse.json({
      autoTagged,
      results
    })
  } catch (err) {
    console.error('[AutoTag] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
