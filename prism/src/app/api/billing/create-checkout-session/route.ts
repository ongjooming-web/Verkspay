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

    // Map plan names and billing periods to Stripe price IDs
    // Format: STRIPE_PRICE_ID_[PLAN]_[BILLING]
    const priceMapKey = `STRIPE_PRICE_ID_${plan.toUpperCase()}_${(billingPeriod || 'monthly').toUpperCase()}`
    const priceId = process.env[priceMapKey]

    if (!priceId) {
      console.error(
        `Missing Stripe price ID: ${priceMapKey}. 
        Ensure this is set in Vercel environment variables:
        STRIPE_PRICE_ID_STARTER_MONTHLY, STRIPE_PRICE_ID_STARTER_ANNUAL,
        STRIPE_PRICE_ID_PRO_MONTHLY, STRIPE_PRICE_ID_PRO_ANNUAL,
        STRIPE_PRICE_ID_ENTERPRISE_MONTHLY, STRIPE_PRICE_ID_ENTERPRISE_ANNUAL`
      )
      return NextResponse.json(
        { error: `Invalid plan or billing period: ${plan} - ${billingPeriod || 'monthly'}. Missing Stripe price ID.` },
        { status: 400 }
      )
    }

    // Create Stripe checkout session with currency
    const sessionParams: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      customer_email: data.user.email,
      metadata: {
        userId: data.user.id,
        plan,
      },
    }

    // Add currency if provided
    if (currency_code) {
      sessionParams.currency = currency_code.toLowerCase()
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
