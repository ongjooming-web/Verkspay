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
    const { data, error: authError } = await supabase.auth.getUser(token)

    if (authError || !data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = data.user.id

    // Check plan gating
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single()

    const plan = profile?.plan || 'trial'
    const allowedPlans = ['pro', 'enterprise']

    // Master test account bypass
    const masterTestEmails = (process.env.MASTER_TEST_EMAILS || '').split(',')
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const isMasterTest = masterTestEmails.includes(userData?.user?.email || '')

    if (!isMasterTest && !allowedPlans.includes(plan)) {
      return NextResponse.json({ count: 0 })
    }

    // Count pending follow-ups
    const { count } = await supabase
      .from('client_follow_ups')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending')

    return NextResponse.json({ count: count || 0 })
  } catch (err) {
    console.error('[FollowUps Count] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
