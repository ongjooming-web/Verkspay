import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Stripe with API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, amount, clientEmail } = await req.json()

    console.log('[stripe/payment-link] Creating payment link for invoice:', invoiceId)
    console.log('[stripe/payment-link] Amount:', amount, 'Email:', clientEmail)

    if (!invoiceId || !amount || !clientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, amount, clientEmail' },
        { status: 400 }
      )
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

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

    // Check if invoice already paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice already paid' },
        { status: 400 }
      )
    }

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

    // Create Stripe Payment Link
    // Using connected account via Stripe API
    const paymentLink = await stripe.paymentLinks.create(
      {
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Invoice ${invoice.invoice_number}`,
                description: invoice.description || 'Invoice payment'
              },
              unit_amount: Math.round(amount * 100) // Convert to cents
            },
            quantity: 1
          }
        ],
        customer_data: {
          email: clientEmail
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceId}?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceId}?cancelled=true`,
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceId}?success=true`
          }
        }
      },
      {
        // Send request to connected Stripe account
        stripeAccount: profile.stripe_account_id
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
