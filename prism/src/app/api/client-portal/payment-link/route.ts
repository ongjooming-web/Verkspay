import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

export async function POST(req: NextRequest) {
  try {
    const { invoice_id, amount } = await req.json()

    if (!invoice_id || !amount) {
      return NextResponse.json(
        { error: 'Missing invoice_id or amount' },
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

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, client_id, amount, currency_code')
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !invoice) {
      console.error('[client-portal/payment-link] Invoice not found:', invoiceError)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Fetch client for email
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('id', invoice.client_id)
      .single()

    if (clientError || !client) {
      console.error('[client-portal/payment-link] Client not found:', clientError)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Convert currency code to Stripe currency (lowercase, remove spaces)
    const stripeCurrency = (invoice.currency_code || 'USD').toLowerCase()

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: stripeCurrency,
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `Payment for invoice ${invoice.invoice_number}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/client-portal/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/client-portal`,
      customer_email: client.email,
      metadata: {
        invoice_id: invoice.id,
        client_id: client.id,
        invoice_number: invoice.invoice_number,
      },
    })

    if (!session.url) {
      throw new Error('Failed to create Stripe session')
    }

    console.log('[client-portal/payment-link] Payment link created:', {
      invoice_id,
      session_id: session.id,
      url: session.url,
    })

    return NextResponse.json({
      success: true,
      payment_link: session.url,
      session_id: session.id,
    })
  } catch (error) {
    console.error('[client-portal/payment-link] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment link' },
      { status: 500 }
    )
  }
}
