import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper to calculate percentile value
function getPercentileValue(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0
  const index = Math.floor(sortedArray.length * percentile)
  return sortedArray[index] || 0
}

// Helper to calculate days since date
function daysSinceDate(date: string | null): number {
  if (!date) return Infinity
  const dateObj = new Date(date)
  const now = new Date()
  return Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24))
}

async function evaluateTagsForClient(
  client: any,
  allClients: any[],
  recurringMap: Map<string, boolean>,
  recentInvoicesMap: Map<string, number>,
  latePayerMap: Map<string, number>,
  thresholds: any
) {
  const tags: string[] = []

  // Rule 1: VIP (top 10% by revenue, invoice_count >= 3)
  if (allClients.length >= 3 && client.invoice_count >= 3) {
    if (client.total_revenue >= thresholds.p90) {
      tags.push('VIP')
    }
  }

  // Rule 2: High Value (70th-90th percentile, invoice_count >= 2)
  // Only if VIP wasn't already assigned
  if (!tags.includes('VIP') && allClients.length >= 3 && client.invoice_count >= 2) {
    if (client.total_revenue >= thresholds.p70 && client.total_revenue < thresholds.p90) {
      tags.push('High Value')
    }
  }

  // Rule 3: Recurring (active recurring OR 3+ invoices in 90 days)
  const hasActiveRecurring = recurringMap.get(client.id) || false
  const recentInvoiceCount = recentInvoicesMap.get(client.id) || 0
  if (hasActiveRecurring || recentInvoiceCount >= 3) {
    tags.push('Recurring')
  }

  // Rule 4: Late Payer (40%+ of completed invoices paid late, invoice_count >= 3)
  if (client.invoice_count >= 3) {
    const latePayerPercentage = latePayerMap.get(client.id) || 0
    if (latePayerPercentage >= 40) {
      tags.push('Late Payer')
    }
  }

  // Rule 5: At Risk (outstanding > 30% of total billings)
  const totalBillings = client.total_outstanding + client.total_revenue
  if (totalBillings > 0) {
    const outstandingPct = (client.total_outstanding / totalBillings) * 100
    if (outstandingPct > 30) {
      tags.push('At Risk')
    }
  }

  // Rule 6: Inactive (no invoice in 60+ days, invoice_count >= 3)
  // Only if not "New"
  if (client.invoice_count >= 3) {
    const daysSince = daysSinceDate(client.last_invoice_date)
    if (daysSince > 60) {
      tags.push('Inactive')
    }
  }

  // Rule 7: New (created in last 30 days)
  // Mutually exclusive with Inactive
  if (!tags.includes('Inactive')) {
    const daysSinceCreated = daysSinceDate(client.created_at)
    if (daysSinceCreated <= 30) {
      tags.push('New')
    }
  }

  return tags
}

export async function autoTagClient(clientId: string, userId: string) {
  try {
    console.log('[AutoTagUtil] Running auto-tag for client', clientId)

    // Delegate to autoTagAllClients for consistency (percentile calculation)
    // This ensures we use the same thresholds
    await autoTagAllClients(userId)
  } catch (err) {
    console.error('[AutoTagUtil] Error:', err)
  }
}

export async function autoTagAllClients(userId: string) {
  try {
    console.log('[AutoTagUtil] Running auto-tag for all clients of user', userId)

    // Fetch all clients with their stats
    const { data: allClients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, total_revenue, total_outstanding, last_invoice_date, invoice_count, created_at, client_tag_assignments(tag_id)')
      .eq('user_id', userId)

    if (clientsError || !allClients) {
      console.error('[AutoTagUtil] Error fetching clients:', clientsError)
      return
    }

    if (allClients.length === 0) {
      console.log('[AutoTagUtil] No clients found')
      return
    }

    // Fetch system tags
    const { data: systemTags, error: tagsError } = await supabase
      .from('client_tags')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_system', true)

    if (tagsError || !systemTags) {
      console.error('[AutoTagUtil] Error fetching tags:', tagsError)
      return
    }

    const tagMap = new Map(systemTags.map((t: any) => [t.name, t.id]))

    // Calculate percentile thresholds
    const revenues = allClients
      .map((c) => c.total_revenue || 0)
      .sort((a, b) => b - a) // Sort descending for percentile calculation
    const p90 = getPercentileValue(revenues, 0.1) // Top 10%
    const p70 = getPercentileValue(revenues, 0.3) // Top 30%

    // Batch-fetch recurring invoices (active status)
    const { data: recurringInvoices, error: recurringError } = await supabase
      .from('recurring_invoices')
      .select('client_id')
      .eq('user_id', userId)
      .eq('status', 'active')

    const recurringMap = new Map<string, boolean>()
    recurringInvoices?.forEach((rec: any) => {
      recurringMap.set(rec.client_id, true)
    })

    // Batch-fetch recent invoices (created in last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('client_id')
      .eq('user_id', userId)
      .gt('created_at', ninetyDaysAgo)

    const recentInvoiceCountMap = new Map<string, number>()
    recentInvoices?.forEach((inv: any) => {
      const count = recentInvoiceCountMap.get(inv.client_id) || 0
      recentInvoiceCountMap.set(inv.client_id, count + 1)
    })

    // Batch-fetch paid/paid_partial invoices to calculate late payer percentage
    const { data: completedInvoices, error: completedError } = await supabase
      .from('invoices')
      .select('client_id, due_date, updated_at, status')
      .eq('user_id', userId)
      .in('status', ['paid', 'paid_partial'])

    const latePayerMap = new Map<string, number>()
    const invoiceCountByClient = new Map<string, number>()

    completedInvoices?.forEach((inv: any) => {
      // Count total completed invoices
      const total = invoiceCountByClient.get(inv.client_id) || 0
      invoiceCountByClient.set(inv.client_id, total + 1)

      // Check if paid late
      const dueDate = new Date(inv.due_date)
      const paidDate = new Date(inv.updated_at)
      if (paidDate > dueDate) {
        const late = latePayerMap.get(inv.client_id) || 0
        latePayerMap.set(inv.client_id, late + 1)
      }
    })

    // Calculate late payer percentages
    const latePayerPercentageMap = new Map<string, number>()
    for (const [clientId, lateCount] of latePayerMap) {
      const totalCount = invoiceCountByClient.get(clientId) || 1
      const percentage = (lateCount / totalCount) * 100
      latePayerPercentageMap.set(clientId, percentage)
    }

    // Evaluate and apply tags
    const thresholds = { p90, p70 }
    let totalTagsApplied = 0

    for (const client of allClients) {
      const tagsToApply = await evaluateTagsForClient(
        client,
        allClients,
        recurringMap,
        recentInvoiceCountMap,
        latePayerPercentageMap,
        thresholds
      )

      // Get current auto tags (only remove auto-tags, keep manual)
      const currentAutoTags = new Set<string>()
      const manualTagIds = new Set<string>()

      // Fetch current tag assignments with their is_auto flag
      const { data: assignments } = await supabase
        .from('client_tag_assignments')
        .select('tag_id, is_auto, client_tags(name)')
        .eq('client_id', client.id)

      assignments?.forEach((a: any) => {
        const tagName = a.client_tags?.name
        if (tagName) {
          if (a.is_auto) {
            currentAutoTags.add(tagName)
          } else {
            manualTagIds.add(a.tag_id)
          }
        }
      })

      // Remove auto-tags that no longer apply
      const tagsToRemove = Array.from(currentAutoTags).filter((tag) => !tagsToApply.includes(tag))
      for (const tagName of tagsToRemove) {
        const tagId = tagMap.get(tagName)
        if (tagId) {
          await supabase
            .from('client_tag_assignments')
            .delete()
            .eq('client_id', client.id)
            .eq('tag_id', tagId)
            .eq('is_auto', true)
        }
      }

      // Add new auto-tags
      const tagsToAdd = tagsToApply.filter((tag) => !currentAutoTags.has(tag))
      for (const tagName of tagsToAdd) {
        const tagId = tagMap.get(tagName)
        if (tagId) {
          const { error: assignError } = await supabase
            .from('client_tag_assignments')
            .insert({
              client_id: client.id,
              tag_id: tagId,
              is_auto: true
            })

          if (!assignError) {
            totalTagsApplied++
            console.log('[AutoTagUtil] Applied tag', tagName, 'to client', client.id)
          }
        }
      }

      // Update timestamp
      await supabase
        .from('clients')
        .update({ auto_tags_calculated_at: new Date().toISOString() })
        .eq('id', client.id)
    }

    console.log('[AutoTagUtil] Auto-tagged', allClients.length, 'clients with', totalTagsApplied, 'new tags')
  } catch (err) {
    console.error('[AutoTagUtil] Error:', err)
  }
}
