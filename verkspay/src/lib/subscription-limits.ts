import { createClient } from '@supabase/supabase-js'

// Subscription tier limits
export const LIMITS = {
  free: {
    invoices_per_month: 5,
    payment_links_per_month: 3,
    team_members: 1,
  },
  pro: {
    invoices_per_month: Infinity,
    payment_links_per_month: Infinity,
    team_members: 1,
  },
  enterprise: {
    invoices_per_month: Infinity,
    payment_links_per_month: Infinity,
    team_members: 5,
  },
}

/**
 * Check if user has exceeded subscription limits
 */
export async function checkSubscriptionLimits(
  userId: string,
  limitType: 'invoices' | 'payment_links',
  supabaseKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey
    )

    // Get user's plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single()

    const tier = profile?.plan || 'trial'

    // Get current month counts
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    if (limitType === 'invoices') {
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())

      const limit = LIMITS[tier as keyof typeof LIMITS]?.invoices_per_month || 0
      return { count: count || 0, limit, exceeded: (count || 0) >= limit }
    }

    if (limitType === 'payment_links') {
      const { count } = await supabase
        .from('payment_records')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())

      const limit = LIMITS[tier as keyof typeof LIMITS]?.payment_links_per_month || 0
      return { count: count || 0, limit, exceeded: (count || 0) >= limit }
    }

    return { count: 0, limit: 0, exceeded: false }
  } catch (error) {
    console.error('Error checking subscription limits:', error)
    return { count: 0, limit: 0, exceeded: false }
  }
}

/**
 * Get user's plan
 */
export async function getUserTier(userId: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single()

    return profile?.plan || 'trial'
  } catch (error) {
    console.error('Error getting user plan:', error)
    return 'trial'
  }
}
