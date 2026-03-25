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
        let planToUpdate = plan
        let targetUserId = userId
        
        console.log('[Webhook] ===== SUBSCRIPTION HANDLING START =====')
        console.log('[Webhook] Session metadata:', session.metadata)
        console.log('[Webhook] Customer email:', session.customer_email)
        console.log('[Webhook] Customer ID:', session.customer)
        console.log('[Webhook] UserId from metadata:', userId)
        console.log('[Webhook] Plan from metadata:', plan)

        // If plan not in metadata, try to get it from price ID
        if (!planToUpdate) {
          console.log('[Webhook] Plan not in metadata, checking line items...')
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
          console.log('[Webhook] Line items retrieved:', { count: lineItems.data?.length })
          
          if (lineItems.data && lineItems.data.length > 0) {
            const firstItem = lineItems.data[0]
            console.log('[Webhook] First line item:', { price: firstItem.price?.id, type: firstItem.price?.type })
            
            if (firstItem.price?.id) {
              planToUpdate = getPlanFromPriceId(firstItem.price.id)
              console.log('[Webhook] Detected plan from price ID:', planToUpdate)
            }
          }
        }

        // If no userId, try to find user by email
        if (!targetUserId && session.customer_email) {
          console.log('[Webhook] No userId in metadata, searching by email:', session.customer_email)
          const { data: users, error: emailError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', session.customer_email)
            .single()

          if (emailError) {
            console.error('[Webhook] Error finding user by email:', {
              email: session.customer_email,
              error: emailError.message
            })
          } else if (users) {
            targetUserId = users.id
            console.log('[Webhook] Found user by email:', targetUserId)
          }
        }

        if (!planToUpdate) {
          console.error('[Webhook] No plan could be determined from metadata or price ID')
          console.error('[Webhook] Full Session:', { 
            id: session.id, 
            customer: session.customer,
            customer_email: session.customer_email,
            metadata: session.metadata,
            subscription: session.subscription
          })
          break
        }

        if (!targetUserId) {
          console.error('[Webhook] No user ID could be determined')
          console.error('[Webhook] Session metadata:', session.metadata)
          console.error('[Webhook] Customer email:', session.customer_email)
          break
        }

        console.log('[Webhook] Updating user subscription:', {
          userId: targetUserId,
          plan: planToUpdate,
          customer: session.customer,
          sessionId: session.id,
          subscriptionId: session.subscription
        })

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            stripe_customer_id: session.customer as string,
            plan: planToUpdate,
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetUserId)

        if (updateError) {
          console.error('[Webhook] ❌ Failed to update user profile:', {
            userId: targetUserId,
            error: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          })
        } else {
          console.log(`[Webhook] ✓ User ${targetUserId} upgraded to ${planToUpdate}`)
        }
        
        console.log('[Webhook] ===== SUBSCRIPTION HANDLING END =====')
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
        console.log(`[Webhook] Payment failed for ${invoice.customer}`)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const subscriptionId = subscription.id

        console.log(`[Webhook] ${event.type} event received`)
        console.log('[Webhook] Processing subscription:', { 
          subscriptionId, 
          customerId,
          itemsCount: subscription.items?.data?.length 
        })

        // Extract price ID from subscription items
        if (!subscription.items?.data || subscription.items.data.length === 0) {
          console.error('[Webhook] No items in subscription')
          break
        }

        const priceId = subscription.items.data[0].price?.id
        if (!priceId) {
          console.error('[Webhook] No price ID found in subscription items')
          break
        }

        console.log('[Webhook] Price ID:', priceId)

        // Map price ID to plan
        let planToUpdate = getPlanFromPriceId(priceId)
        console.log('[Webhook] Matched plan from price ID:', planToUpdate)

        if (!planToUpdate) {
          console.error('[Webhook] Could not match price ID to any plan:', priceId)
          console.error('[Webhook] Available env vars:', {
            starter_monthly: !!process.env.STRIPE_PRICE_ID_STARTER_MONTHLY,
            starter_annual: !!process.env.STRIPE_PRICE_ID_STARTER_ANNUAL,
            pro_monthly: !!process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
            pro_annual: !!process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
            enterprise_monthly: !!process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY,
            enterprise_annual: !!process.env.STRIPE_PRICE_ID_ENTERPRISE_ANNUAL,
          })
          break
        }

        // Find user by stripe_customer_id
        console.log('[Webhook] Looking up user by customer ID:', customerId)
        let { data: users, error: findError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('stripe_customer_id', customerId)

        if (findError) {
          console.error('[Webhook] Error finding user by customer ID:', findError.message)
          break
        }

        // If not found by stripe_customer_id, try to get customer email from Stripe and lookup by email
        if (!users || users.length === 0) {
          console.log('[Webhook] No user found by stripe_customer_id, trying to lookup by customer email...')
          
          try {
            const customer = await stripe.customers.retrieve(customerId)
            console.log('[Webhook] Retrieved customer from Stripe:', { 
              id: customer.id, 
              email: customer.email 
            })

            if (customer.email) {
              const { data: usersByEmail, error: emailError } = await supabase
                .from('profiles')
                .select('id, email')
                .eq('email', customer.email)

              if (!emailError && usersByEmail && usersByEmail.length > 0) {
                console.log('[Webhook] Found user by email:', { 
                  userId: usersByEmail[0].id,
                  email: usersByEmail[0].email 
                })
                users = usersByEmail
              } else if (emailError) {
                console.error('[Webhook] Error finding user by email:', emailError.message)
              } else {
                console.warn('[Webhook] No user found with email:', customer.email)
              }
            } else {
              console.warn('[Webhook] Customer has no email address')
            }
          } catch (stripeError: any) {
            console.error('[Webhook] Error retrieving customer from Stripe:', stripeError.message)
          }
        }

        if (!users || users.length === 0) {
          console.error('[Webhook] ❌ Could not find user by customer ID or email')
          console.error('[Webhook] Customer ID:', customerId)
          console.log('[Webhook] This usually means:')
          console.log('[Webhook] 1. User never completed checkout (stripe_customer_id not stored)')
          console.log('[Webhook] 2. Email in Stripe customer doesn\'t match email in profiles table')
          break
        }

        const userId = users[0].id
        console.log('[Webhook] Found user:', { userId, email: users[0].email })

        // Update user's subscription
        console.log('[Webhook] Updating subscription:', {
          userId,
          plan: planToUpdate,
          status: 'active',
          subscriptionId
        })

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            plan: planToUpdate,
            subscription_status: 'active',
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (updateError) {
          console.error('[Webhook] ❌ Failed to update subscription:', {
            userId,
            error: updateError.message,
            hint: updateError.hint
          })
        } else {
          console.log(`[Webhook] ✓ User ${userId} subscription updated to ${planToUpdate}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        console.log('[Webhook] Subscription deleted:', { 
          subscriptionId: subscription.id,
          customerId 
        })

        // Find user by Stripe customer ID
        let { data: users, error: findError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('stripe_customer_id', customerId)

        if (findError) {
          console.error('[Webhook] Error finding user by customer ID:', {
            customerId,
            error: findError.message
          })
          break
        }

        // If not found by stripe_customer_id, try email fallback
        if (!users || users.length === 0) {
          console.log('[Webhook] No user found by stripe_customer_id, trying email lookup...')
          
          try {
            const customer = await stripe.customers.retrieve(customerId)
            if (customer.email) {
              const { data: usersByEmail } = await supabase
                .from('profiles')
                .select('id, email')
                .eq('email', customer.email)

              if (usersByEmail && usersByEmail.length > 0) {
                users = usersByEmail
              }
            }
          } catch (err) {
            console.error('[Webhook] Error retrieving customer:', err)
          }
        }

        if (!users || users.length === 0) {
          console.warn('[Webhook] No user found with customer ID or email:', customerId)
          break
        }

        const userId = users[0].id
        console.log('[Webhook] Found user to downgrade:', userId)

        // Downgrade to trial
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            plan: 'trial',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (updateError) {
          console.error('[Webhook] ❌ Failed to downgrade user:', {
            userId,
            error: updateError.message
          })
        } else {
          console.log(`[Webhook] ✓ User ${userId} downgraded to trial (subscription canceled)`)
        }
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
