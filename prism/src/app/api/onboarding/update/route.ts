import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function PUT(request: NextRequest) {
  try {
    // Verify auth
    const { user, error: authError } = await requireAuth(request)
    
    if (authError) {
      console.log('[Onboarding Update] Auth failed:', authError.message)
      return NextResponse.json({ error: authError.message }, { status: authError.status })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseServer()

    const body = await request.json()
    const { tour_step, dismissed, completed } = body

    const updates: any = {}
    if (typeof tour_step === 'number') {
      updates.onboarding_step = tour_step
    }
    if (typeof dismissed === 'boolean') {
      updates.onboarding_dismissed_at = dismissed ? new Date().toISOString() : null
    }
    if (typeof completed === 'boolean') {
      updates.onboarding_completed = completed
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) {
      console.error('[Onboarding Update] Error:', error)
      return NextResponse.json({ error: 'Failed to update onboarding status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Onboarding Update] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
