import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Zero-decimal currencies: Stripe expects amounts as whole units, not cents
 * Example: 500 IDR is passed as 500, not 50000
 */
const ZERO_DECIMAL_CURRENCIES = ['IDR', 'JPY', 'KRW', 'VND', 'BIF', 'GNF', 'MGA', 'PYG', 'RWF', 'UGX', 'XAF', 'XOF']

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify token and get user
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { plan, currency_code, billingPeriod } = await request.json()

    console.log('[Checkout] Creating session:', { userId: data.user.id, email: data.user.email, plan, billingPeriod })

    // Map plan names and billing periods to Stripe price IDs
    const priceMapKey = `PRISM_${plan.toUpperCase()}_${(billingPeriod || 'monthly').toUpperCase()}`
    const priceId = process.env[priceMapKey]

    if (!priceId) {
      console.error(
        `Missing Stripe price ID: ${priceMapKey}. 
        Ensure this is set in Vercel environment variables:
        PRISM_STARTER_MONTHLY, PRISM_STARTER_ANNUAL,
        PRISM_PRO_MONTHLY, PRISM_PRO_ANNUAL,
        PRISM_ENTERPRISE_MONTHLY, PRISM_ENTERPRISE_ANNUAL`
      )
      return NextResponse.json(
        { error: `Invalid plan or billing period: ${plan} - ${billingPeriod || 'monthly'}. Missing Stripe price ID.` },
        { status: 400 }
      )
    }

    // Check if user already has a stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', data.user.id)
      .single()

    let stripeCustomerId: string | null = null

    if (!profileError && profile?.stripe_customer_id) {
      // Use existing customer
      stripeCustomerId = profile.stripe_customer_id
      console.log('[Checkout] Using existing Stripe customer:', stripeCustomerId)
    } else {
      // Create new Stripe customer
      console.log('[Checkout] Creating new Stripe customer for:', data.user.email)
      const customer = await stripe.customers.create({
        email: data.user.email,
        metadata: { user_id: data.user.id },
      })
      stripeCustomerId = customer.id
      console.log('[Checkout] New Stripe customer created:', stripeCustomerId)

      // Save stripe_customer_id to profile immediately
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.user.id)

      if (updateError) {
        console.error('[Checkout] Failed to save stripe_customer_id:', {
          userId: data.user.id,
          customerId: stripeCustomerId,
          error: updateError.message
        })
      } else {
        console.log('[Checkout] ✓ Stripe customer ID saved to profile')
      }
    }

    // Create checkout session with customer and client_reference_id
    const sessionParams: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      client_reference_id: data.user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
      metadata: {
        user_id: data.user.id,
        plan,
        billing_period: billingPeriod || 'monthly',
      },
    }

    // Add currency if provided
    if (currency_code) {
      sessionParams.currency = currency_code.toLowerCase()
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log('[Checkout] ✓ Session created:', { sessionId: session.id, customerId: stripeCustomerId })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
