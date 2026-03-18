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

    console.log('[Stripe Webhook] Event type:', event.type, 'Account:', event.account)

    // Handle payment_intent.succeeded (from Payment Links)
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log('[Stripe Webhook] Payment intent succeeded:', paymentIntent.id)

      // Find invoice by payment intent ID (stored when creating payment link)
      const { data: invoices, error: searchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('stripe_payment_session_id', paymentIntent.id)

      if (searchError || !invoices || invoices.length === 0) {
        console.log('[Stripe Webhook] No invoice found for payment intent:', paymentIntent.id)
        return NextResponse.json({ received: true }, { status: 200 })
      }

      const invoice = invoices[0]
      console.log('[Stripe Webhook] Found invoice:', invoice.id, 'Marking as paid')

      // Update invoice to paid
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString(),
          payment_method: 'stripe',
          payment_recipient: `Stripe Payment Link • ${paymentIntent.id.slice(0, 12)}...`,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id)

      if (updateError) {
        console.error('[Stripe Webhook] Failed to update invoice:', updateError)
      } else {
        console.log('[Stripe Webhook] Invoice marked as paid:', invoice.id)
      }

      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Handle checkout.session.completed (legacy - for backward compatibility)
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
