import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = data.user.id

    // Get user's existing Stripe account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    if (!profile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'No Stripe account found. Create one first.' },
        { status: 400 }
      )
    }

    console.log('[Stripe Resume] Generating account link for:', profile.stripe_account_id)

    // Generate state param with userId
    const stateObj = { userId }
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64')
    
    console.log('[Stripe Resume] State object:', stateObj)
    console.log('[Stripe Resume] Encoded state:', state)
    console.log('[Stripe Resume] App URL:', process.env.NEXT_PUBLIC_APP_URL)

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/return?state=${encodeURIComponent(state)}`
    const refreshUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/refresh?state=${encodeURIComponent(state)}`
    
    console.log('[Stripe Resume] Return URL:', returnUrl)
    console.log('[Stripe Resume] Refresh URL:', refreshUrl)

    // Generate new account onboarding link for existing account
    const accountLink = await stripe.accountLinks.create({
      account: profile.stripe_account_id,
      type: 'account_onboarding',
      return_url: returnUrl,
      refresh_url: refreshUrl
    })

    console.log('[Stripe Resume] Generated account link:', accountLink.url)

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    console.error('[Stripe Resume] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate account link' },
      { status: 500 }
    )
  }
}
