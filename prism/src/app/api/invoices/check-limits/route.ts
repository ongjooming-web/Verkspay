import { NextRequest, NextResponse } from 'next/server'
import { checkSubscriptionLimits } from '@/lib/subscription-limits'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { limitType } = await req.json()

    // Get auth token
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Get user
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
