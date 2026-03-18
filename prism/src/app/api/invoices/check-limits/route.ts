import { NextRequest, NextResponse } from 'next/server'
import { checkSubscriptionLimits } from '@/lib/subscription-limits'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { limitType } = await req.json()

    // Verify auth using shared helper
    const { user, error: authError } = await requireAuth(req)
    if (authError) {
      console.error('[invoices/check-limits] Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      )
    }

    // Check limits
    const result = await checkSubscriptionLimits(
      user.id,
      limitType as 'invoices' | 'payment_links',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('[invoices/check-limits] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error', allowed: true }, // Default to allow
      { status: 500 }
    )
  }
}
