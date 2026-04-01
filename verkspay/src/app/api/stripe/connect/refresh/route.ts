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
    const accountId = req.nextUrl.searchParams.get('account')

    if (!accountId) {
      console.error('[Connect Refresh] No account in query params')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?stripe=error`
      )
    }

    console.log('[Connect Refresh] Re-creating onboarding link for account:', accountId)

    // Find user by stripe_account_id
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_account_id', accountId)
      .single()

    if (userError || !user) {
      console.error('[Connect Refresh] User not found for account:', accountId)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?stripe=error`
      )
    }

    // Create new onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/refresh?account=${accountId}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/return?account_id=${accountId}`,
    })

    console.log('[Connect Refresh] New onboarding link created')

    // Redirect to new onboarding URL
    return NextResponse.redirect(accountLink.url)
  } catch (error) {
    console.error('[Connect Refresh] Error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?stripe=error`
    )
  }
}
