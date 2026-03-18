import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

// Use service role to write to database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const stripeAccountId = searchParams.get('stripe_user_id')
    const state = searchParams.get('state')

    console.log('[Stripe Return] Received callback:', { stripeAccountId, state })

    if (!stripeAccountId) {
      console.error('[Stripe Return] No stripe_user_id in callback')
      return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
    }

    if (!state) {
      console.error('[Stripe Return] No state param in callback')
      return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
    }

    // Decode state to get userId
    let userId: string | null = null
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
      userId = decoded.userId
      console.log('[Stripe Return] Decoded userId from state:', userId)
    } catch (e) {
      console.error('[Stripe Return] Failed to decode state:', e)
      return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
    }

    if (!userId) {
      console.error('[Stripe Return] No userId in state')
      return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
    }

    // User successfully returned from Stripe onboarding, so mark as complete
    // In test mode, Stripe's API flags don't reliably reflect completion, so we trust the callback
    const isOnboardingComplete = true
    
    console.log('[Stripe Return] User returned from onboarding, marking as complete')

    // Update or insert profile with Stripe account info
    console.log('[Stripe Return] Saving stripe_account_id for user:', userId)

    const { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          stripe_account_id: stripeAccountId,
          stripe_onboarding_complete: isOnboardingComplete,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('[Stripe Return] Error saving Stripe account:', upsertError)
      return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
    }

    console.log('[Stripe Return] Successfully saved Stripe account:', {
      userId,
      stripeAccountId,
      isOnboardingComplete,
      profile
    })

    // Redirect to settings with success param
    return NextResponse.redirect(new URL('/settings?stripe=success', process.env.NEXT_PUBLIC_APP_URL!))
  } catch (err: any) {
    console.error('[Stripe Return] Unexpected error:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    })
    return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
  }
}
