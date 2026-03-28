import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const updates: any = {}

    if (body.tour_step !== undefined) updates.onboarding_step = body.tour_step
    if (body.dismissed === true) updates.onboarding_dismissed_at = new Date().toISOString()
    if (body.completed === true) updates.onboarding_completed = true

    console.log('[Onboarding Update] Request body:', body)
    console.log('[Onboarding Update] Updates to apply:', updates)
    console.log('[Onboarding Update] User ID:', userData.user.id)

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userData.user.id)

    if (error) {
      console.error('[Onboarding Update] Error:', error)
      return NextResponse.json({ error: 'Failed to update', details: error.message }, { status: 500 })
    }

    console.log('[Onboarding Update] Successfully updated')

    return NextResponse.json({ success: true, ...updates })
  } catch (error) {
    console.error('[Onboarding] Update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
