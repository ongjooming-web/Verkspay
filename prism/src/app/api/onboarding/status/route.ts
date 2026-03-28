import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: userData, error: authError } = await supabase.auth.getUser(token)

    if (authError || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = userData.user.id

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_step, onboarding_dismissed_at, business_name, stripe_customer_id, latest_insights')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[Onboarding Status] Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('[Onboarding Status] Profile data:', {
      userId,
      onboarding_completed: profile?.onboarding_completed,
      onboarding_step: profile?.onboarding_step,
      onboarding_dismissed_at: profile?.onboarding_dismissed_at,
      business_name: profile?.business_name,
      stripe_customer_id: profile?.stripe_customer_id,
      latest_insights: !!profile?.latest_insights
    })

    // Count clients
    const { count: clientCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Count invoices
    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const tasks = {
      business_profile: !!(profile?.business_name && profile.business_name.trim() !== ''),
      stripe_connected: !!profile?.stripe_customer_id,
      first_client: (clientCount || 0) >= 1,
      first_invoice: (invoiceCount || 0) >= 1,
      ai_insights: !!(profile?.latest_insights && typeof profile.latest_insights === 'string' && profile.latest_insights.trim() !== ''),
    }

    const completedCount = Object.values(tasks).filter(Boolean).length

    const response = {
      completed: profile?.onboarding_completed || false,
      dismissed: !!profile?.onboarding_dismissed_at,
      tour_step: profile?.onboarding_step || 0,
      tasks,
      completed_count: completedCount,
      total_tasks: 5,
    }

    console.log('[Onboarding Status] Returning response:', response)

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Onboarding] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
