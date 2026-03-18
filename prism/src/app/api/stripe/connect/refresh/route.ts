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

    console.log('[Stripe Refresh] Refresh callback received:', { stripeAccountId, state })

    // Same logic as return handler - user is refreshing onboarding
    if (!stripeAccountId || !state) {
      console.error('[Stripe Refresh] Missing required params')
      return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
    }

    // Decode state to get userId
    let userId: string | null = null
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
      userId = decoded.userId
      console.log('[Stripe Refresh] Decoded userId from state:', userId)
    } catch (e) {
      console.error('[Stripe Refresh] Failed to decode state:', e)
      return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
    }

    if (!userId) {
      console.error('[Stripe Refresh] No userId in state')
      return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
    }

    // Check if onboarding is actually complete
    console.log('[Stripe Refresh] Retrieving Stripe account details for:', stripeAccountId)
    
    const Stripe = require('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    
    const account = await stripe.accounts.retrieve(stripeAccountId)
    const isOnboardingComplete = account.details_submitted === true
    
    console.log('[Stripe Refresh] Account details:', {
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled
    })

    // Update profile with Stripe account info
    console.log('[Stripe Refresh] Updating stripe_account_id for user:', userId)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_account_id: stripeAccountId,
        stripe_onboarding_complete: isOnboardingComplete,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[Stripe Refresh] Error updating Stripe account:', updateError)
      return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
    }

    console.log('[Stripe Refresh] Successfully updated Stripe account for user:', userId)

    // Redirect back to settings
    return NextResponse.redirect(new URL('/settings?stripe=success', process.env.NEXT_PUBLIC_APP_URL!))
  } catch (err: any) {
    console.error('[Stripe Refresh] Unexpected error:', err)
    return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
  }
}
