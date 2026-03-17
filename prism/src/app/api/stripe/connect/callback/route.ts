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
    const state = searchParams.get('state')

    if (!stripeAccountId) {
      console.log('[Stripe] No stripe_user_id in callback')
      return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
    }

    console.log('[Stripe] Callback received with stripeAccountId:', stripeAccountId)

    // Extract userId from state param
    let userId: string | null = null

    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
        userId = decoded.userId
        console.log('[Stripe] Decoded userId from state:', userId)
      } catch (e) {
        console.error('[Stripe] Could not parse state param:', e)
      }
    }

    if (!userId) {
      console.error('[Stripe] Could not get userId from state, redirecting to login')
      return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))
    }

    console.log('[Stripe] Callback: userId =', userId, 'stripeAccountId =', stripeAccountId)

    // Use service role to update profile
    const { error: updateError, data: updateData } = await supabase
      .from('profiles')
      .update({
        stripe_account_id: stripeAccountId,
        stripe_onboarding_complete: true
      })
      .eq('id', userId)
      .select()

    if (updateError) {
      console.error('[Stripe] Update error:', updateError)
      
      // Profile might not exist, try upsert
      console.log('[Stripe] Attempting upsert instead...')
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          stripe_account_id: stripeAccountId,
          stripe_onboarding_complete: true,
          updated_at: new Date().toISOString()
        })

      if (upsertError) {
        console.error('[Stripe] Upsert error:', upsertError)
        return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
      }
      
      console.log('[Stripe] Upsert successful')
    } else {
      console.log('[Stripe] Profile updated:', updateData)
    }

    console.log('[Stripe] Redirecting to settings with success')
    return NextResponse.redirect(new URL('/settings?stripe=success', process.env.NEXT_PUBLIC_APP_URL!))
  } catch (err: any) {
    console.error('[Stripe] Callback error:', err)
    return NextResponse.redirect(new URL('/settings?stripe=error', process.env.NEXT_PUBLIC_APP_URL!))
  }
}
