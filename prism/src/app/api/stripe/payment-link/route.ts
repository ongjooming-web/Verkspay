import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { formatCurrency } from '@/lib/countries'

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

    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice already paid' },
        { status: 400 }
      )
    }

    // Create Checkout Session instead of Payment Link for better metadata handling
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: invoice.description || 'Invoice payment',
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceId}?payment_status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoiceId}?payment_status=cancel`,
      customer_email: clientEmail,
      metadata: {
        invoiceId,
        amount: amount.toString(),
        type: 'partial_payment',
      },
    })

    console.log('[stripe/payment-link] Checkout session created:', session.id)

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('[stripe/payment-link] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    )
  }
}
