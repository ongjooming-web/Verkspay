import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json() // 'pro' or 'enterprise'

    console.log('[billing/create-checkout] Creating checkout for plan:', plan)

    if (!plan || !['pro', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "pro" or "enterprise"' },
        { status: 400 }
      )
    }

    // Get auth token from header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client with user token
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

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('[billing/create-checkout] Auth error:', userError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = user.id
    const userEmail = user.email

    console.log('[billing/create-checkout] User:', userId, 'Email:', userEmail)

    // Use service role to get/update profile
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[billing/create-checkout] Profile error:', profileError)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get or create Stripe customer
    let stripeCustomerId = profile.stripe_customer_id

    if (!stripeCustomerId) {
      console.log('[billing/create-checkout] Creating new Stripe customer')
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId
        }
      })
      stripeCustomerId = customer.id

      // Save customer ID to profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId)

      if (updateError) {
        console.error('[billing/create-checkout] Failed to save customer ID:', updateError)
      }
    }

    console.log('[billing/create-checkout] Stripe customer:', stripeCustomerId)

    // Get price ID based on plan
    const priceId = plan === 'pro'
      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
      : process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE

    if (!priceId) {
      console.error('[billing/create-checkout] Price ID not configured for plan:', plan)
      return NextResponse.json(
        { error: 'Billing configuration error' },
        { status: 500 }
      )
    }

    console.log('[billing/create-checkout] Price ID:', priceId)

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?billing=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?billing=cancelled`,
      metadata: {
        userId: userId,
        plan: plan
      }
    })

    console.log('[billing/create-checkout] Checkout session created:', session.id)

    return NextResponse.json({
      success: true,
      url: session.url
    }, { status: 200 })
  } catch (error: any) {
    console.error('[billing/create-checkout] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
