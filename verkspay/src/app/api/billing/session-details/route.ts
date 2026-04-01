import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      console.error('[Session Details] Missing session_id')
      return NextResponse.json(
        { error: 'Missing session_id parameter' },
        { status: 400 }
      )
    }

    console.log('[Session Details] Fetching session:', sessionId)

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    console.log('[Session Details] Session retrieved:', {
      id: session.id,
      status: session.payment_status,
      metadata: session.metadata,
      customer: session.customer,
    })

    // Extract plan from metadata
    const plan = session.metadata?.plan || 'unknown'
    const billingPeriod = session.metadata?.billing_period || 'monthly'
    const userId = session.client_reference_id

    // Check if payment was successful
    const paymentSuccessful = session.payment_status === 'paid'

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      paymentSuccessful,
      plan,
      billingPeriod,
      userId,
      amount: session.amount_total ? (session.amount_total / 100).toFixed(2) : null,
      currency: session.currency?.toUpperCase(),
      customerEmail: session.customer_email,
      status: session.status,
    })
  } catch (error) {
    console.error('[Session Details] Error:', error)
    const errorMessage = error instanceof Stripe.errors.StripeError
      ? error.message
      : error instanceof Error
      ? error.message
      : 'Failed to retrieve session'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
