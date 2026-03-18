import { createClient } from '@supabase/supabase-js'

// Subscription tier limits
export const LIMITS = {
  free: {
    invoices_per_month: 5,
    payment_links_per_month: 3
  },
  pro: {
    invoices_per_month: Infinity,
    payment_links_per_month: Infinity
  },
  enterprise: {
    invoices_per_month: Infinity,
    payment_links_per_month: Infinity
  }
}

/**
 * Check if user has exceeded subscription limits
 */
export async function checkSubscriptionLimits(
  userId: string,
  limitType: 'invoices' | 'payment_links',
  supabaseKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey
  )

  // Get user's subscription tier
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return { allowed: false, error: 'Profile not found' }
  }

  const tier = profile.subscription_tier || 'free'
  const limits = LIMITS[tier as keyof typeof LIMITS]

  if (!limits) {
    return { allowed: false, error: 'Unknown subscription tier' }
  }

  // Get current month start
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Count usage this month
  let count = 0

  if (limitType === 'invoices') {
    const { data: invoices, error: countError } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString())

    if (countError) {
      return { allowed: false, error: 'Failed to count invoices' }
    }

    count = invoices?.length || 0
    const limit = limits.invoices_per_month

    if (count >= limit) {
      return {
        allowed: false,
        error: `Free tier limited to ${limit} invoices/month. Upgrade to Pro to create unlimited invoices.`,
        count,
        limit,
        tier
      }
    }

    return { allowed: true, count, limit, tier }
  }

  if (limitType === 'payment_links') {
    const { data: links, error: countError } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('stripe_payment_session_id IS NOT', null)
      .gte('payment_link_generated_at', monthStart.toISOString())

    if (countError) {
      return { allowed: false, error: 'Failed to count payment links' }
    }

    count = links?.length || 0
    const limit = limits.payment_links_per_month

    if (count >= limit) {
      return {
        allowed: false,
        error: `Free tier limited to ${limit} payment links/month. Upgrade to Pro for unlimited.`,
        count,
        limit,
        tier
      }
    }

    return { allowed: true, count, limit, tier }
  }

  return { allowed: false, error: 'Invalid limit type' }
}
