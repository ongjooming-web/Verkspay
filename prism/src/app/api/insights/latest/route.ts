import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ClaudeInsights, InsightsResponse } from '../generate/route'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_LIMITS: Record<string, number> = {
  trial: 10,
  starter: 10,
  pro: 30,
  enterprise: 999999,
}

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
    console.log('[Insights/Latest] Fetching for user:', userId)

    // Fetch user's profile with insights data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('latest_insights, insights_generated_at, plan, insights_generated_count')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[Insights/Latest] Profile fetch error:', profileError)
      return NextResponse.json(
        { insights: null, generated_at: null, usage: null },
        { status: 200 }
      )
    }

    if (!profile.latest_insights || !profile.insights_generated_at) {
      console.log('[Insights/Latest] No saved insights for user:', userId)
      return NextResponse.json(
        { insights: null, generated_at: null, usage: null },
        { status: 200 }
      )
    }

    const plan = profile.plan || 'trial'
    const planLimit = PLAN_LIMITS[plan] || PLAN_LIMITS.trial
    const usageCount = profile.insights_generated_count || 0

    const response: InsightsResponse & { generated_at: string } = {
      insights: profile.latest_insights as ClaudeInsights,
      generated_at: profile.insights_generated_at,
      usage: {
        used: usageCount,
        limit: planLimit,
        plan,
      },
    }

    console.log('[Insights/Latest] ✓ Fetched saved insights for user:', userId)
    return NextResponse.json(response)
  } catch (error) {
    console.error('[Insights/Latest] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}
