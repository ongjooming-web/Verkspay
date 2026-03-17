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
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message)
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
    }

    console.log('[Stripe Webhook] Event type:', event.type)

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const invoiceId = session.metadata?.invoiceId
      const userId = session.metadata?.userId

      console.log('[Stripe Webhook] Payment completed for invoice:', invoiceId)

      if (invoiceId && userId) {
        // Update invoice status to paid
        const { error } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('id', invoiceId)
          .eq('user_id', userId)

        if (error) {
          console.error('[Stripe Webhook] Update invoice error:', error)
          return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
        }

        // Update payment intent
        await supabase
          .from('payment_intents')
          .update({ status: 'completed' })
          .eq('stripe_session_id', session.id)

        console.log('[Stripe Webhook] Invoice marked as paid:', invoiceId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[Stripe Webhook] Error:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
