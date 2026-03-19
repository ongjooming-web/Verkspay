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

    console.log('[Stripe Webhook] ======== WEBHOOK RECEIVED ========')
    console.log('[Stripe Webhook] Event ID:', event.id)
    console.log('[Stripe Webhook] Event type:', event.type)
    console.log('[Stripe Webhook] Account:', event.account)
    console.log('[Stripe Webhook] Created:', new Date(event.created * 1000).toISOString())

    // Handle customer.subscription.created (new subscription)
    if (event.type === 'customer.subscription.created') {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId
      const plan = subscription.metadata?.plan

      console.log('[Stripe Webhook] Subscription created for user:', userId, 'Plan:', plan)

      if (userId) {
        // Determine tier from plan
        const tier = plan === 'enterprise' ? 'enterprise' : 'pro'

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_tier: tier,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (updateError) {
          console.error('[Stripe Webhook] Failed to update subscription:', updateError)
        } else {
          console.log('[Stripe Webhook] ✓ Subscription updated for user:', userId)
        }
      }

      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Handle customer.subscription.updated (plan changed or renewed)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId
      const plan = subscription.metadata?.plan

      console.log('[Stripe Webhook] Subscription updated for user:', userId, 'Status:', subscription.status)

      if (userId) {
        const tier = plan === 'enterprise' ? 'enterprise' : 'pro'

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            subscription_tier: tier,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (updateError) {
          console.error('[Stripe Webhook] Failed to update subscription:', updateError)
        } else {
          console.log('[Stripe Webhook] ✓ Subscription updated for user:', userId)
        }
      }

      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Handle customer.subscription.deleted (cancelled subscription)
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId

      console.log('[Stripe Webhook] Subscription cancelled for user:', userId)

      if (userId) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_id: null,
            subscription_status: 'cancelled',
            subscription_tier: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (updateError) {
          console.error('[Stripe Webhook] Failed to cancel subscription:', updateError)
        } else {
          console.log('[Stripe Webhook] ✓ Subscription cancelled for user:', userId)
        }
      }

      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Handle checkout.session.completed (from Payment Links)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const invoiceId = session.metadata?.invoiceId
      const freelancerId = session.metadata?.freelancerId
      const partialAmount = session.metadata?.partialAmount
      const isPartialPayment = session.metadata?.isPartialPayment === 'true'

      console.log('[Stripe Webhook] Checkout completed')
      console.log('[Stripe Webhook] Session ID:', session.id)
      console.log('[Stripe Webhook] Session metadata:', session.metadata)
      console.log('[Stripe Webhook] Extracted invoiceId:', invoiceId)
      console.log('[Stripe Webhook] Is partial payment:', isPartialPayment)
      console.log('[Stripe Webhook] Partial amount:', partialAmount)

      if (!invoiceId) {
        console.log('[Stripe Webhook] ❌ No invoiceId in metadata, skipping')
        console.log('[Stripe Webhook] Full session object:', JSON.stringify(session, null, 2))
        return NextResponse.json({ received: true }, { status: 200 })
      }

      console.log('[Stripe Webhook] ✓ Found invoiceId, processing payment...')

      // Fetch current invoice to get amount
      const { data: invoiceData, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (fetchError || !invoiceData) {
        console.error('[Stripe Webhook] ❌ Failed to fetch invoice:', fetchError)
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }

      // Handle partial vs full payment
      let paymentAmount = parseFloat(partialAmount || '0')
      if (!isPartialPayment) {
        // Full payment - use invoice amount
        paymentAmount = invoiceData.amount
      }

      console.log('[Stripe Webhook] Payment amount to record:', paymentAmount)
      console.log('[Stripe Webhook] Invoice total amount:', invoiceData.amount)

      // Calculate new totals
      const newAmountPaid = (invoiceData.amount_paid || 0) + paymentAmount
      const newRemainingBalance = invoiceData.amount - newAmountPaid

      // Determine status
      let newStatus = 'unpaid'
      if (newAmountPaid >= invoiceData.amount) {
        newStatus = 'paid'
      } else if (newAmountPaid > 0) {
        newStatus = 'paid_partial'
      }

      console.log('[Stripe Webhook] New totals - Amount paid:', newAmountPaid, 'Remaining:', newRemainingBalance, 'Status:', newStatus)

      // 1. Create payment record
      const { error: recordError } = await supabase
        .from('payment_records')
        .insert([
          {
            invoice_id: invoiceId,
            amount: paymentAmount,
            payment_method: 'stripe',
            payment_date: new Date().toISOString().split('T')[0],
            notes: `Stripe Payment • ${session.id.slice(0, 12)}...`
          }
        ])

      if (recordError) {
        console.error('[Stripe Webhook] ❌ Failed to create payment record:', recordError)
      } else {
        console.log('[Stripe Webhook] ✓ Payment record created')
      }

      // 2. Update invoice
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          remaining_balance: Math.max(0, newRemainingBalance),
          status: newStatus,
          paid_date: newStatus === 'paid' ? new Date().toISOString() : invoiceData.paid_date,
          payment_method: 'stripe',
          payment_recipient: `Stripe Payment • ${session.id.slice(0, 12)}...`,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (updateError) {
        console.error('[Stripe Webhook] ❌ Failed to update invoice:', updateError)
        return NextResponse.json({ error: 'Update failed', details: updateError }, { status: 500 })
      } else {
        console.log('[Stripe Webhook] ✓ Invoice updated - Status:', newStatus, 'Amount paid:', newAmountPaid)
      }

      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Handle payment_intent.succeeded (legacy - for backward compatibility)
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log('[Stripe Webhook] Payment intent succeeded:', paymentIntent.id)

      // Try to find invoice by stored session ID
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
          payment_recipient: `Stripe Payment • ${paymentIntent.id.slice(0, 12)}...`,
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

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[Stripe Webhook] Error:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
