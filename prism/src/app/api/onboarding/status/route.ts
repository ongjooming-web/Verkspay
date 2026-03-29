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
    // Note: Columns like onboarding_completed, onboarding_step, onboarding_dismissed_at, 
    // business_name, stripe_customer_id, latest_insights may not exist on older databases.
    // The API gracefully handles missing columns by using defaults.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[Onboarding Status] Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Ensure all onboarding fields have defaults if they don't exist
    const safeProfile = {
      onboarding_completed: profile?.onboarding_completed ?? false,
      onboarding_step: profile?.onboarding_step ?? 0,
      onboarding_dismissed_at: profile?.onboarding_dismissed_at ?? null,
      business_name: profile?.business_name ?? '',
      stripe_customer_id: profile?.stripe_customer_id ?? null,
      latest_insights: profile?.latest_insights ?? null,
    }

    console.log('[Onboarding Status] Profile data:', {
      userId,
      onboarding_completed: safeProfile.onboarding_completed,
      onboarding_step: safeProfile.onboarding_step,
      onboarding_dismissed_at: safeProfile.onboarding_dismissed_at,
      business_name: safeProfile.business_name,
      stripe_customer_id: safeProfile.stripe_customer_id,
      latest_insights: !!safeProfile.latest_insights
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
      business_profile: !!(safeProfile.business_name && safeProfile.business_name.trim() !== ''),
      stripe_connected: !!safeProfile.stripe_customer_id,
      first_client: (clientCount || 0) >= 1,
      first_invoice: (invoiceCount || 0) >= 1,
      ai_insights: !!(safeProfile.latest_insights && typeof safeProfile.latest_insights === 'string' && safeProfile.latest_insights.trim() !== ''),
    }

    const completedCount = Object.values(tasks).filter(Boolean).length

    const response = {
      completed: safeProfile.onboarding_completed,
      dismissed: !!safeProfile.onboarding_dismissed_at,
      tour_step: safeProfile.onboarding_step,
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
