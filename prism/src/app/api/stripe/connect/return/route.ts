import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      console.error('[Stripe Connect Return] Missing userId in callback')
      return NextResponse.redirect(
        new URL('/settings/payment?error=missing_user', request.url)
      )
    }

    // 1. Fetch the user's stripe_account_id from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.stripe_account_id) {
      console.error('[Stripe Connect Return] No stripe_account_id found for user:', userId)
      return NextResponse.redirect(
        new URL('/settings/payment?error=no_stripe_account', request.url)
      )
    }

    // 2. Verify onboarding status directly with Stripe API
    const account = await stripe.accounts.retrieve(profile.stripe_account_id)

    const isOnboardingComplete =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled

    console.log(`[Stripe Connect Return] Account ${profile.stripe_account_id}:`, {
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      isOnboardingComplete,
    })

    // 3. Update stripe_onboarding_complete in profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_onboarding_complete: isOnboardingComplete,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[Stripe Connect Return] Failed to update profile:', updateError)
      return NextResponse.redirect(
        new URL('/settings/payment?error=update_failed', request.url)
      )
    }

    console.log(`[Stripe Connect Return] stripe_onboarding_complete set to ${isOnboardingComplete} for user ${userId}`)

    // 4. Redirect based on actual onboarding status
    if (isOnboardingComplete) {
      return NextResponse.redirect(
        new URL('/settings/payment?stripe=connected', request.url)
      )
    } else {
      // Onboarding started but not finished — send back to complete it
      return NextResponse.redirect(
        new URL('/settings/payment?stripe=incomplete', request.url)
      )
    }
  } catch (error) {
    console.error('[Stripe Connect Return] Fatal error:', (error as any)?.message)
    return NextResponse.redirect(
      new URL('/settings/payment?error=server_error', request.url)
    )
  }
}
