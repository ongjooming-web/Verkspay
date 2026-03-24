import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(req: NextRequest) {
  try {
    // CRITICAL: Read raw body as text BEFORE parsing
    // Stripe signature verification requires exact raw bytes
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')!

    if (!sig) {
      console.error('[stripe/webhook] Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Construct event with raw body string
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err: any) {
      console.error('[stripe/webhook] Signature verification failed:', err.message)
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      )
    }

    console.log('[stripe/webhook] Event received:', event.type, event.id)

    const supabase = getSupabaseServer()

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('[stripe/webhook] Checkout completed:', session.id)

        // Check if this is a partial payment or full payment
        const isPartialPayment = session.metadata?.isPartialPayment === 'true'
        const invoiceId = session.metadata?.invoiceId
        const partialAmount = session.metadata?.partialAmount
        const freelancerId = session.metadata?.freelancerId

        if (!invoiceId) {
          console.warn('[stripe/webhook] No invoiceId in metadata')
          return NextResponse.json({ received: true })
        }

        if (isPartialPayment && partialAmount) {
          // Handle partial payment
          console.log('[stripe/webhook] Processing partial payment:', partialAmount)

          const amount = parseFloat(partialAmount)

          // Record payment
          const { error: paymentError } = await supabase
            .from('payment_records')
            .insert({
              invoice_id: invoiceId,
              amount_paid: amount,
              payment_date: new Date().toISOString(),
              payment_type: 'stripe',
              tx_hash: session.id,
              status: 'completed'
            })

          if (paymentError) {
            console.error('[stripe/webhook] Error recording payment:', paymentError)
            return NextResponse.json({ error: paymentError.message }, { status: 500 })
          }

          // Update invoice balance
          const { data: invoice } = await supabase
            .from('invoices')
            .select('amount_paid, remaining_balance, amount')
            .eq('id', invoiceId)
            .single()

          if (invoice) {
            const newAmountPaid = (invoice.amount_paid || 0) + amount
            const newRemainingBalance = invoice.amount - newAmountPaid
            const newStatus = newRemainingBalance <= 0 ? 'paid' : 'paid_partial'

            await supabase
              .from('invoices')
              .update({
                amount_paid: newAmountPaid,
                remaining_balance: newRemainingBalance,
                status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', invoiceId)
          }
        } else {
          // Handle full payment
          console.log('[stripe/webhook] Processing full payment')

          const { data: invoice } = await supabase
            .from('invoices')
            .select('amount, currency_code')
            .eq('id', invoiceId)
            .single()

          if (invoice) {
            const { error: paymentError } = await supabase
              .from('payment_records')
              .insert({
                invoice_id: invoiceId,
                amount_paid: invoice.amount,
                payment_date: new Date().toISOString(),
                payment_type: 'stripe',
                tx_hash: session.id,
                status: 'completed'
              })

            if (!paymentError) {
              await supabase
                .from('invoices')
                .update({
                  status: 'paid',
                  amount_paid: invoice.amount,
                  remaining_balance: 0,
                  paid_date: new Date().toISOString(),
                  payment_method: 'stripe',
                  updated_at: new Date().toISOString()
                })
                .eq('id', invoiceId)
            }
          }
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log('[stripe/webhook] Charge refunded:', charge.id)
        // Handle refund logic here if needed
        break
      }

      default: {
        console.log('[stripe/webhook] Unhandled event type:', event.type)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[stripe/webhook] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
