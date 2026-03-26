import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isMasterAccount } from '@/utils/isMasterAccount'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify token and get user
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = data.user.id
    const userEmail = data.user.email || ''

    // Check if master account
    const isMaster = isMasterAccount(userEmail)
    if (isMaster) {
      return NextResponse.json({
        canCreate: true,
        limit: Infinity,
        count: 0,
        plan: 'master',
        message: 'Master account - unlimited proposals'
      })
    }

    // Get user's plan
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single()

    if (profileError || !profileData) {
      console.error('[CheckProposalLimit] Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 400 }
      )
    }

    const plan = profileData.plan || 'trial'

    // Define limits by plan
    const limits: { [key: string]: number } = {
      trial: 3,
      starter: 10,
      pro: Infinity,
      enterprise: Infinity
    }

    const limit = limits[plan] || 3

    // Count proposals created this month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const { data: proposalsData, error: proposalsError } = await supabase
      .from('proposals')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    if (proposalsError) {
      console.error('[CheckProposalLimit] Error counting proposals:', proposalsError)
      return NextResponse.json(
        { error: 'Failed to check proposal count' },
        { status: 400 }
      )
    }

    const count = proposalsData?.length || 0
    const canCreate = count < limit

    console.log('[CheckProposalLimit]', { userId, plan, limit, count, canCreate })

    return NextResponse.json({
      canCreate,
      limit,
      count,
      plan,
      message: canCreate
        ? `${limit === Infinity ? 'Unlimited' : limit - count} proposals remaining this month`
        : `You've reached your ${limit} proposal limit for this month. Upgrade to create more.`
    })
  } catch (err) {
    console.error('[CheckProposalLimit] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
