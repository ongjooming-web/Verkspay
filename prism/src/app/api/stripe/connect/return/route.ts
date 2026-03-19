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

export async function GET(req: NextRequest) {
  try {
    // Get the account ID from the URL params (Stripe sends it back)
    const accountId = req.nextUrl.searchParams.get('account_id')
    
    if (!accountId) {
      console.error('[Connect Return] No account_id in query params')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?stripe=error&message=No+account+found`
      )
    }

    console.log('[Connect Return] Processing return for account:', accountId)

    // Find user by stripe_account_id
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_account_id', accountId)
      .single()

    if (userError || !user) {
      console.error('[Connect Return] User not found for account:', accountId, userError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?stripe=error&message=Account+not+found`
      )
    }

    // Retrieve account details to check onboarding status
    const account = await stripe.accounts.retrieve(accountId)
    
    console.log('[Connect Return] Account details retrieved')
    console.log('[Connect Return] Charges enabled:', account.charges_enabled)
    console.log('[Connect Return] Payouts enabled:', account.payouts_enabled)

    // Check if onboarding is complete (both charges and payouts enabled)
    const onboardingComplete = account.charges_enabled && account.payouts_enabled

    // Update user profile with onboarding status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_onboarding_complete: onboardingComplete,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Connect Return] Update failed:', updateError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?stripe=error&message=Failed+to+save+onboarding+status`
      )
    }

    console.log(`[Connect Return] User ${user.id} onboarding status set to: ${onboardingComplete}`)

    // Redirect back to settings with success status
    const redirectUrl = onboardingComplete
      ? `${process.env.NEXT_PUBLIC_APP_URL}/settings?stripe=success&account=${accountId}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/settings?stripe=incomplete&message=Onboarding+not+yet+complete`

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('[Connect Return] Error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?stripe=error&message=Server+error`
    )
  }
}
