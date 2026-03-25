import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { InsightsData } from '../data/route'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type ClaudeInsights = {
  summary: string
  highlights: {
    type: 'positive' | 'warning' | 'action'
    title: string
    description: string
  }[]
  client_insights: {
    client_name: string
    health: 'good' | 'attention' | 'at_risk'
    note: string
  }[]
  recommendations: string[]
  revenue_trend: 'growing' | 'stable' | 'declining'
}

export type InsightsResponse = {
  insights: ClaudeInsights
  usage: {
    used: number
    limit: number
    plan: string
  }
}

const PLAN_LIMITS: Record<string, number> = {
  trial: 10,
  starter: 10,
  pro: 30,
  enterprise: 999999, // unlimited
}

async function fetchInsightsData(userId: string, token: string): Promise<InsightsData> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.prismops.xyz'}/api/insights/data`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch insights data: ${response.status}`)
  }

  return response.json()
}

async function callClaudeAPI(insightsData: InsightsData): Promise<ClaudeInsights> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const systemPrompt = `You are a business analyst for a freelancer's invoicing platform. Analyze the provided business data and generate actionable insights.

Respond ONLY with valid JSON, no markdown, no code blocks, no preamble. Use this exact structure:
{
  "summary": "2-3 sentence executive summary of the business health",
  "highlights": [
    {
      "type": "positive" | "warning" | "action",
      "title": "Short title",
      "description": "1-2 sentence insight"
    }
  ],
  "client_insights": [
    {
      "client_name": "Name",
      "health": "good" | "attention" | "at_risk",
      "note": "1 sentence about this client"
    }
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    "Actionable recommendation 3"
  ],
  "revenue_trend": "growing" | "stable" | "declining"
}

Rules:
- Be specific with numbers and names, not vague
- Flag clients with overdue invoices or declining payment patterns
- Suggest concrete actions (follow up with X, adjust terms for Y)
- Keep highlights to 3-5 items max
- Keep recommendations to 3-5 items max
- If there's very little data (< 3 invoices), say so and give basic advice
- Use the user's currency in any amounts you mention`

  const userMessage = `Here is my business data: ${JSON.stringify(insightsData)}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[Insights] Claude API error:', response.status, error)
    throw new Error(`Claude API failed: ${response.status}`)
  }

  const result = await response.json()
  const content = result.content[0]?.text

  if (!content) {
    throw new Error('No response from Claude')
  }

  // Strip markdown code blocks if present
  const jsonStr = content
    .replace(/^```json\n?/, '')
    .replace(/\n?```$/, '')
    .trim()

  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error('[Insights] Failed to parse Claude response:', jsonStr)
    throw new Error('Invalid JSON from Claude')
  }
}

export async function POST(request: NextRequest) {
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
    console.log('[Insights] Generate request for user:', userId)

    // STEP 1: Check trial & plan status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, trial_end_date, trial_expired, insights_generated_count, insights_usage_reset_date')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[Insights] Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'profile_not_found', message: 'User profile not found' },
        { status: 404 }
      )
    }

    const plan = profile.plan || 'trial'
    let trialExpired = profile.trial_expired
    const trialEndDate = profile.trial_end_date ? new Date(profile.trial_end_date) : null

    // Check if trial has expired
    if (plan === 'trial' && trialEndDate && new Date() > trialEndDate && !trialExpired) {
      // Mark as expired
      await supabase
        .from('profiles')
        .update({ trial_expired: true })
        .eq('id', userId)
      trialExpired = true
    }

    if (plan === 'trial' && trialExpired) {
      console.log('[Insights] Trial expired for user:', userId)
      return NextResponse.json(
        {
          error: 'trial_expired',
          message: 'Your 15-day trial has ended. Choose a plan to continue using AI Insights.',
          trial_ended: true,
        },
        { status: 403 }
      )
    }

    // STEP 2: Check rate limit
    let usageCount = profile.insights_generated_count || 0
    const usageResetDate = profile.insights_usage_reset_date ? new Date(profile.insights_usage_reset_date) : new Date()
    const now = new Date()

    // Check if we're in a new month
    if (usageResetDate.getMonth() !== now.getMonth() || usageResetDate.getFullYear() !== now.getFullYear()) {
      console.log('[Insights] Usage reset for new month:', userId)
      usageCount = 0
      const newResetDate = new Date(now.getFullYear(), now.getMonth(), 1)
      await supabase
        .from('profiles')
        .update({
          insights_generated_count: 0,
          insights_usage_reset_date: newResetDate.toISOString(),
        })
        .eq('id', userId)
    }

    const planLimit = PLAN_LIMITS[plan] || PLAN_LIMITS.trial
    if (usageCount >= planLimit) {
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      console.log('[Insights] Rate limit reached for user:', { userId, plan, used: usageCount, limit: planLimit })
      return NextResponse.json(
        {
          error: 'rate_limit',
          message: 'You\'ve used all your AI Insights for this month. Upgrade your plan for more.',
          used: usageCount,
          limit: planLimit,
          resets_at: nextMonthDate.toISOString(),
        },
        { status: 429 }
      )
    }

    // STEP 3: Generate insights
    console.log('[Insights] Fetching business data...')
    let insightsData: InsightsData

    try {
      insightsData = await fetchInsightsData(userId, token)
    } catch (e) {
      console.error('[Insights] Data fetch error:', e)
      return NextResponse.json(
        { error: 'data_error', message: 'Failed to fetch business data.' },
        { status: 500 }
      )
    }

    console.log('[Insights] Calling Claude API...')
    let insights: ClaudeInsights

    try {
      insights = await callClaudeAPI(insightsData)
    } catch (e) {
      console.error('[Insights] Claude error:', e)
      if ((e as Error).message.includes('not configured')) {
        return NextResponse.json(
          { error: 'config_error', message: 'AI service not configured.' },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: 'ai_error', message: 'Failed to generate insights. Please try again.' },
        { status: 500 }
      )
    }

    // STEP 4: Update usage & return
    const newCount = usageCount + 1
    console.log('[Insights] Updating usage count:', { userId, newCount, plan })

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ insights_generated_count: newCount })
      .eq('id', userId)

    if (updateError) {
      console.error('[Insights] Failed to update usage:', updateError)
      // Don't fail the request, just log it
    }

    const response: InsightsResponse = {
      insights,
      usage: {
        used: newCount,
        limit: planLimit,
        plan,
      },
    }

    console.log('[Insights] ✓ Insights generated successfully for user:', userId)
    return NextResponse.json(response)
  } catch (error) {
    console.error('[Insights] Unexpected error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
