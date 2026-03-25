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

export async function POST(request: NextRequest) {
  try {
    const sig = request.headers.get('stripe-signature')
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('[Webhook] Missing signature or secret')
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      )
    }

    const body = await request.text()
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err: any) {
      console.error('[Webhook] Signature verification failed:', err.message)
      console.error('[Webhook] This usually means:')
      console.error('[Webhook] 1. STRIPE_WEBHOOK_SECRET in .env.local is wrong')
      console.error('[Webhook] 2. You regenerated the secret in Stripe Dashboard but forgot to update .env.local')
      console.error('[Webhook] 3. If using Stripe CLI, the secret from "stripe listen" should be used')
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      )
    }

    console.log('Stripe webhook event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan
        const invoiceId = session.metadata?.invoiceId
        const paymentType = session.metadata?.type

        console.log('[Webhook] checkout.session.completed detected')
        console.log('[Webhook] Metadata:', { userId, plan, invoiceId, paymentType })
        console.log('[Webhook] Amount total:', session.amount_total)

        // PARTIAL PAYMENT HANDLING
        if (paymentType === 'partial_payment' && invoiceId && session.amount_total) {
          // Zero-decimal currencies don't need division
          const ZERO_DECIMAL_CURRENCIES = ['IDR', 'JPY', 'KRW', 'VND', 'BIF', 'GNF', 'MGA', 'PYG', 'RWF', 'UGX', 'XAF', 'XOF']
          const currency = session.currency || 'usd'
          const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())
          const amountPaid = isZeroDecimal ? session.amount_total : session.amount_total / 100

          console.log(`[Webhook] Partial payment received for invoice ${invoiceId}: $${amountPaid}`)

          // Fetch current invoice state
          const { data: invoice, error: fetchError } = await supabase
            .from('invoices')
            .select('amount, amount_paid, status, paid_date')
            .eq('id', invoiceId)
            .single()

          if (fetchError || !invoice) {
            console.error(`[Webhook] Invoice not found: ${invoiceId}`, fetchError)
            break
          }

          const newAmountPaid = (invoice.amount_paid || 0) + amountPaid
          const remainingBalance = invoice.amount - newAmountPaid
          const newStatus = remainingBalance <= 0 ? 'paid' : 'paid_partial'

          // Update invoice
          await supabase
            .from('invoices')
            .update({
              amount_paid: newAmountPaid,
              remaining_balance: Math.max(0, remainingBalance),
              status: newStatus,
              paid_date: newStatus === 'paid' ? new Date().toISOString() : invoice.paid_date,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId)

          // Log payment record
          await supabase
            .from('payment_records')
            .insert({
              invoice_id: invoiceId,
              amount: amountPaid,
              payment_method: 'stripe',
              payment_date: new Date().toISOString(),
              notes: `Stripe Checkout Session ${session.id}`,
              created_at: new Date().toISOString(),
            })

          console.log(`[Webhook] Invoice ${invoiceId} updated: amount_paid=$${newAmountPaid}, status=${newStatus}`)
        }

        // SUBSCRIPTION HANDLING
        if (userId && plan && session.customer) {
          await supabase
            .from('profiles')
            .update({
              stripe_customer_id: session.customer as string,
              plan: plan,
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          console.log(`User ${userId} upgraded to ${plan}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by Stripe customer ID and downgrade to free
        const { data: users } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)

        if (users && users.length > 0) {
          await supabase
            .from('profiles')
            .update({
              plan: 'trial',
              subscription_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', users[0].id)

          console.log(`User ${users[0].id} subscription canceled`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Payment succeeded for ${invoice.customer}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Payment failed for ${invoice.customer}`)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
