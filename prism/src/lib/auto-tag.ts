import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Auto-tagging business rules
export const AUTO_TAG_RULES = [
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

export async function autoTagClient(clientId: string, userId: string) {
  try {
    console.log('[AutoTagUtil] Running auto-tag for client', clientId)

    // Fetch client stats
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, total_revenue, total_outstanding, last_invoice_date, invoice_count, client_tag_assignments(tag_id)')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single()

    if (clientError || !client) {
      console.error('[AutoTagUtil] Client not found:', clientId)
      return
    }

    // Fetch system tags for this user
    const { data: systemTags, error: tagsError } = await supabase
      .from('client_tags')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_system', true)

    if (tagsError) {
      console.error('[AutoTagUtil] Error fetching tags:', tagsError)
      return
    }

    // Create tag map
    const tagMap = new Map(systemTags?.map((t: any) => [t.name, t.id]) || [])

    // Calculate days overdue
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

    // Evaluate rules
    const rulesToApply: any[] = []
    for (const rule of AUTO_TAG_RULES) {
      if (rule.condition(stats)) {
        rulesToApply.push(rule)
      }
    }

    // Apply tags
    const currentTagIds = client.client_tag_assignments?.map((a: any) => a.tag_id) || []
    let tagsApplied = 0

    for (const rule of rulesToApply) {
      const tagId = tagMap.get(rule.name)
      if (tagId && !currentTagIds.includes(tagId)) {
        const { error: assignError } = await supabase
          .from('client_tag_assignments')
          .insert({
            client_id: client.id,
            tag_id: tagId,
            is_auto: true
          })

        if (!assignError) {
          tagsApplied++
          console.log('[AutoTagUtil] Applied tag', rule.name, 'to client', clientId)
        }
      }
    }

    // Update timestamp
    await supabase
      .from('clients')
      .update({ auto_tags_calculated_at: new Date().toISOString() })
      .eq('id', clientId)

    console.log('[AutoTagUtil] Auto-tagged client', clientId, 'with', tagsApplied, 'new tags')
  } catch (err) {
    console.error('[AutoTagUtil] Error:', err)
  }
}

export async function autoTagAllClients(userId: string) {
  try {
    console.log('[AutoTagUtil] Running auto-tag for all clients of user', userId)

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)

    if (clientsError || !clients) {
      console.error('[AutoTagUtil] Error fetching clients:', clientsError)
      return
    }

    let total = 0
    for (const client of clients) {
      await autoTagClient(client.id, userId)
      total++
    }

    console.log('[AutoTagUtil] Auto-tagged', total, 'clients')
  } catch (err) {
    console.error('[AutoTagUtil] Error:', err)
  }
}
