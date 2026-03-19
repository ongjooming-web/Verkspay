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

    // Check if user already has a Stripe account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    if (profile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Stripe account already connected' },
        { status: 400 }
      )
    }

    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: data.user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    })

    console.log('[Stripe] Created Express account:', account.id)

    // Save stripe_account_id to profile
    await supabase
      .from('profiles')
      .update({ stripe_account_id: account.id })
      .eq('id', userId)

    // Create Express onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      type: 'account_onboarding',
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/refresh?account=${account.id}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/return?account_id=${account.id}`,
    })

    console.log('[Stripe] Created onboarding link')

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('[Stripe Connect] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create Stripe Connect account' },
      { status: 500 }
    )
  }
}
