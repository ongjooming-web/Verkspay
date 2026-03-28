import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_name, stripe_customer_id, onboarding_completed, onboarding_step, onboarding_dismissed_at, latest_insights')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Count clients
    const { count: clientCount, error: clientError } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Count invoices
    const { count: invoiceCount, error: invoiceError } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const tasks = {
      business_profile: !!(profile.company_name && profile.company_name.trim() !== ''),
      stripe_connected: !!profile.stripe_customer_id,
      first_client: (clientCount || 0) >= 1,
      first_invoice: (invoiceCount || 0) >= 1,
      ai_insights: !!(profile.latest_insights && typeof profile.latest_insights === 'string' && profile.latest_insights.trim() !== '')
    }

    const completedCount = Object.values(tasks).filter(Boolean).length
    const isDismissed = !!profile.onboarding_dismissed_at
    const isCompleted = profile.onboarding_completed || completedCount === 5

    return NextResponse.json({
      completed: isCompleted,
      dismissed: isDismissed,
      tasks,
      completed_count: completedCount,
      total_tasks: 5,
      tour_step: profile.onboarding_step || 0
    })
  } catch (err) {
    console.error('[Onboarding Status] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
