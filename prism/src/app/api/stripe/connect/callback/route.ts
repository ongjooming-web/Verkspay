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
    const { searchParams } = new URL(req.url)
    const stripeAccountId = searchParams.get('stripe_user_id')

    if (!stripeAccountId) {
      console.log('[Stripe] No stripe_user_id in callback')
      return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
    }

    // Get authenticated user from cookie or session
    const { data, error } = await supabase.auth.getSession()
    if (error || !data?.session?.user?.id) {
      console.log('[Stripe] No session found')
      return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))
    }

    const userId = data.session.user.id

    console.log('[Stripe] Callback: userId =', userId, 'stripeAccountId =', stripeAccountId)

    // Update profile with stripe_account_id and mark onboarding as complete
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_account_id: stripeAccountId,
        stripe_onboarding_complete: true
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[Stripe] Update error:', updateError)
      return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
    }

    console.log('[Stripe] Callback: Updated profile, redirecting to settings')
    return NextResponse.redirect(new URL('/settings?stripe=success', process.env.NEXT_PUBLIC_APP_URL!))
  } catch (err: any) {
    console.error('[Stripe] Callback error:', err)
    return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
  }
}
