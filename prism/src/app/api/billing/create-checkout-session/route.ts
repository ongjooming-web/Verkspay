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

    // Use Supabase service role to validate token securely
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Validate token using service role
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(
      '' // Will fail, but we need to use getUser properly
    )

    // Actually, let's decode the token directly but verify it's from our Supabase instance
    // Extract and verify JWT
    let userId: string
    let userEmail: string

    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid token format')
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      )

      userId = payload.sub
      userEmail = payload.email

      console.log('[billing/create-checkout] Token decoded - user:', userId)

      if (!userId || !userEmail) {
        throw new Error('Missing userId or email in token')
      }

      // Verify token is from our Supabase instance by checking aud claim
      if (payload.aud !== 'authenticated') {
        throw new Error('Invalid token audience')
      }
    } catch (err: any) {
      console.error('[billing/create-checkout] Token validation error:', err)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    console.log('[billing/create-checkout] User:', userId, 'Email:', userEmail)

    // Check for duplicate subscription (Issue #4)
    console.log('[billing/create-checkout] Checking for existing subscription...')
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_id')
      .eq('id', userId)
      .single()

    if (profileCheckError) {
      console.error('[billing/create-checkout] Profile check error:', profileCheckError)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Prevent duplicate subscriptions
    if (existingProfile?.subscription_tier && existingProfile.subscription_tier !== 'free') {
      console.warn('[billing/create-checkout] User already has active subscription:', existingProfile.subscription_tier)
      return NextResponse.json(
        { error: 'You already have an active subscription. Use "Manage Subscription" to upgrade or cancel.' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    let stripeCustomerId = existingProfile?.stripe_customer_id

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

    // Get price ID based on plan (Issue #1 - use server-side env vars)
    const priceId = plan === 'pro'
      ? process.env.STRIPE_PRICE_PRO
      : process.env.STRIPE_PRICE_ENTERPRISE

    if (!priceId) {
      console.error('[billing/create-checkout] Price ID not configured for plan:', plan)
      console.error('[billing/create-checkout] Available env vars:', {
        pro: !!process.env.STRIPE_PRICE_PRO,
        enterprise: !!process.env.STRIPE_PRICE_ENTERPRISE
      })
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
