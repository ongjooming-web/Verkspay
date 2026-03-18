import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await context.params
    const { amount, clientEmail } = await req.json()

    console.log('[invoices/partial-payment-link] Creating partial payment link for invoice:', invoiceId)
    console.log('[invoices/partial-payment-link] Amount:', amount, 'Email:', clientEmail)

    if (!invoiceId || !amount || !clientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, amount, clientEmail' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Get Supabase server client
    const supabase = getSupabaseServer()

    // Fetch invoice (public - no auth needed for client payments)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error('[invoices/partial-payment-link] Invoice not found:', invoiceError)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Check if already fully paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      )
    }

    // Check if amount exceeds remaining balance
    const remainingBalance = invoice.remaining_balance || invoice.amount
    if (amount > remainingBalance) {
      return NextResponse.json(
        { error: `Amount cannot exceed remaining balance: $${remainingBalance.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Fetch freelancer profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, stripe_account_id, stripe_onboarding_complete')
      .eq('id', invoice.user_id)
      .single()

    if (profileError || !profile) {
      console.error('[invoices/partial-payment-link] Profile not found:', profileError)
      return NextResponse.json(
        { error: 'Freelancer profile not found' },
        { status: 404 }
      )
    }

    // Check if Stripe is connected
    if (!profile.stripe_account_id || !profile.stripe_onboarding_complete) {
      console.error('[invoices/partial-payment-link] Stripe not connected')
      return NextResponse.json(
        { error: 'Freelancer has not connected Stripe yet' },
        { status: 400 }
      )
    }

    // Create product and price for this partial payment
    const product = await stripe.products.create({
      name: `Partial Payment - Invoice ${invoice.invoice_number}`,
      description: `Partial payment of $${amount.toFixed(2)} towards invoice ${invoice.invoice_number}`,
      type: 'service',
      metadata: {
        invoiceId: invoiceId,
        freelancerId: invoice.user_id,
        freelancerStripeAccount: profile.stripe_account_id,
        isPartialPayment: 'true'
      }
    })

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount * 100),
      currency: 'usd'
    })

    // Create payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1
        }
      ],
      metadata: {
        invoiceId: invoiceId,
        freelancerId: invoice.user_id,
        freelancerStripeAccount: profile.stripe_account_id,
        partialAmount: amount.toString(),
        isPartialPayment: 'true'
      },
      customer_creation: 'always',
      billing_address_collection: 'auto',
      after_completion: {
        type: 'redirect' as const,
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceId}?success=true&partial=true`
        }
      }
    })

    console.log('[invoices/partial-payment-link] Payment link created:', paymentLink.id)

    return NextResponse.json({
      success: true,
      payment_url: paymentLink.url,
      session_id: paymentLink.id,
      amount: amount
    }, { status: 200 })
  } catch (error: any) {
    console.error('[invoices/partial-payment-link] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment link' },
      { status: 500 }
    )
  }
}
