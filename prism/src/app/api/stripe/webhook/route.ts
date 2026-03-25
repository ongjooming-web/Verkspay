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
 * Map Stripe price IDs to plan names
 */
function getPlanFromPriceId(priceId: string): string | undefined {
  const priceMap: { [key: string]: string } = {
    [process.env.STRIPE_PRICE_ID_STARTER_MONTHLY || '']: 'starter',
    [process.env.STRIPE_PRICE_ID_STARTER_ANNUAL || '']: 'starter',
    [process.env.STRIPE_PRICE_ID_PRO_MONTHLY || '']: 'pro',
    [process.env.STRIPE_PRICE_ID_PRO_ANNUAL || '']: 'pro',
    [process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY || '']: 'enterprise',
    [process.env.STRIPE_PRICE_ID_ENTERPRISE_ANNUAL || '']: 'enterprise',
  }
  return priceMap[priceId]
}

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

        // SUBSCRIPTION HANDLING - Update plan based on metadata or price ID
        if (userId && session.customer) {
          let planToUpdate = plan
          
          // If plan not in metadata, try to get it from price ID
          if (!planToUpdate && session.line_items) {
            console.log('[Webhook] Plan not in metadata, checking line items...')
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
            if (lineItems.data && lineItems.data.length > 0) {
              const firstItem = lineItems.data[0]
              console.log('[Webhook] First line item:', { price: firstItem.price?.id })
              if (firstItem.price?.id) {
                planToUpdate = getPlanFromPriceId(firstItem.price.id)
                console.log('[Webhook] Detected plan from price ID:', planToUpdate)
              }
            }
          }

          if (!planToUpdate) {
            console.error('[Webhook] No plan could be determined from metadata or price ID')
            console.error('[Webhook] Session:', { 
              id: session.id, 
              customer: session.customer,
              metadata: session.metadata,
              line_items: session.line_items
            })
            break
          }

          console.log('[Webhook] Updating user subscription:', {
            userId,
            plan: planToUpdate,
            customer: session.customer,
            sessionId: session.id
          })

          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              stripe_customer_id: session.customer as string,
              plan: planToUpdate,
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          if (updateError) {
            console.error('[Webhook] Failed to update user profile:', {
              userId,
              error: updateError.message,
              details: updateError.details
            })
          } else {
            console.log(`[Webhook] ✓ User ${userId} upgraded to ${planToUpdate}`)
          }
        } else {
          console.warn('[Webhook] Missing required data for subscription update:', {
            userId,
            plan,
            customer: session.customer,
            metadata: session.metadata
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        console.log('[Webhook] Subscription canceled:', { 
          subscriptionId: subscription.id,
          customerId 
        })

        // Find user by Stripe customer ID and downgrade to trial
        const { data: users, error: findError } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)

        if (findError) {
          console.error('[Webhook] Error finding user by customer ID:', {
            customerId,
            error: findError.message
          })
          break
        }

        if (users && users.length > 0) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              plan: 'trial',
              subscription_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', users[0].id)

          if (updateError) {
            console.error('[Webhook] Failed to update plan on subscription cancel:', {
              userId: users[0].id,
              error: updateError.message
            })
          } else {
            console.log(`[Webhook] ✓ User ${users[0].id} subscription canceled, plan set to trial`)
          }
        } else {
          console.warn('[Webhook] No user found with customer ID:', customerId)
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
