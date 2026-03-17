import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-15'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json()

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Stripe account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Stripe account not connected' },
        { status: 400 }
      )
    }

    // Get invoice details
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single()

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get invoice items for line items
    const { data: lineItems } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)

    // Convert to Stripe line items (amount in cents)
    const stripeLineItems = (lineItems || []).map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.description || 'Service',
          metadata: { invoiceId }
        },
        unit_amount: Math.round((item.amount || 0) * 100)
      },
      quantity: item.quantity || 1
    }))

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        line_items: stripeLineItems,
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceId}?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceId}?payment=cancelled`,
        customer_email: invoice.client_email,
        metadata: {
          invoiceId,
          userId: user.id
        }
      },
      {
        stripeAccount: profile.stripe_account_id
      }
    )

    console.log('[Stripe] Created checkout session:', session.id, 'for account:', profile.stripe_account_id)

    // Save payment intent to database
    await supabase.from('payment_intents').insert({
      invoice_id: invoiceId,
      user_id: user.id,
      stripe_session_id: session.id,
      status: 'pending',
      amount: invoice.total
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[Stripe] Payment link error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to create payment link' },
      { status: 500 }
    )
  }
}
