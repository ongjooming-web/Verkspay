import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-server'

// Initialize Stripe with API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, amount, clientEmail } = await req.json()

    console.log('[stripe/payment-link] Creating payment link for invoice:', invoiceId)
    console.log('[stripe/payment-link] Amount:', amount, 'Email:', clientEmail)

    // Verify auth token using shared helper
    const { user, error: authError } = await requireAuth(req)
    if (authError) {
      console.error('[stripe/payment-link] Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      )
    }

    const userId = user.id
    console.log('[stripe/payment-link] Authenticated user:', userId)

    if (!invoiceId || !amount || !clientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, amount, clientEmail' },
        { status: 400 }
      )
    }

    // Get Supabase server client
    const supabase = getSupabaseServer()

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error('[stripe/payment-link] Invoice not found:', invoiceError)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Verify user owns this invoice (ownership check)
    if (invoice.user_id !== userId) {
      console.error('[stripe/payment-link] User does not own this invoice:', { userId, invoice_user_id: invoice.user_id })
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this invoice' },
        { status: 403 }
      )
    }

    // Check if invoice already paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice already paid' },
        { status: 400 }
      )
    }

    // Check subscription limits for payment links
    console.log('[stripe/payment-link] Checking subscription limits for user:', invoice.user_id)
    const { checkSubscriptionLimits } = await import('@/lib/subscription-limits')
    const limitCheck = await checkSubscriptionLimits(
      invoice.user_id,
      'payment_links',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    if (!limitCheck.allowed) {
      console.log('[stripe/payment-link] Payment link limit exceeded:', limitCheck)
      return NextResponse.json(
        {
          error: limitCheck.error,
          code: 'LIMIT_EXCEEDED',
          count: limitCheck.count,
          limit: limitCheck.limit,
          tier: limitCheck.tier
        },
        { status: 402 } // 402 Payment Required
      )
    }

    console.log('[stripe/payment-link] ✓ Payment link limit check passed')

    // Fetch freelancer profile to get Stripe account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, stripe_account_id, stripe_onboarding_complete')
      .eq('id', invoice.user_id)
      .single()

    if (profileError || !profile) {
      console.error('[stripe/payment-link] Profile not found:', profileError)
      return NextResponse.json(
        { error: 'Freelancer profile not found' },
        { status: 404 }
      )
    }

    // Check if Stripe is connected
    if (!profile.stripe_account_id || !profile.stripe_onboarding_complete) {
      console.error('[stripe/payment-link] Stripe not connected for user:', invoice.user_id)
      return NextResponse.json(
        { error: 'Freelancer has not connected Stripe yet' },
        { status: 400 }
      )
    }

    console.log('[stripe/payment-link] Stripe account:', profile.stripe_account_id)

    // Create Stripe Product and Price on MAIN account
    // This ensures webhook fires on main account
    const product = await stripe.products.create(
      {
        name: `Invoice ${invoice.invoice_number}`,
        description: invoice.description || 'Invoice payment',
        type: 'service',
        metadata: {
          invoiceId: invoiceId,
          freelancerId: invoice.user_id,
          freelancerStripeAccount: profile.stripe_account_id
        }
      }
    )

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd'
      }
    )

    // Create Stripe Payment Link on MAIN account
    // Money will be transferred to freelancer via transfer
    const paymentLink = await stripe.paymentLinks.create(
      {
        line_items: [
          {
            price: price.id,
            quantity: 1
          }
        ],
        metadata: {
          invoiceId: invoiceId,
          freelancerId: invoice.user_id,
          freelancerStripeAccount: profile.stripe_account_id
        },
        customer_creation: 'always',
        billing_address_collection: 'auto',
        after_completion: {
          type: 'redirect' as const,
          redirect: {
            url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceId}?success=true`
          }
        }
      }
    )

    console.log('[stripe/payment-link] Payment link created:', paymentLink.id)

    // Store the session/link ID in the invoice for webhook matching
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        stripe_payment_session_id: paymentLink.id,
        payment_link_generated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    if (updateError) {
      console.error('[stripe/payment-link] Failed to store session ID:', updateError)
      // Don't fail the request, but log it
    }

    console.log('[stripe/payment-link] Stored session ID in invoice')

    return NextResponse.json({
      success: true,
      payment_url: paymentLink.url,
      session_id: paymentLink.id
    }, { status: 200 })
  } catch (error: any) {
    console.error('[stripe/payment-link] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment link' },
      { status: 500 }
    )
  }
}
