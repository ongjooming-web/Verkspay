import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await context.params

    console.log('[invoices/public] Fetching invoice:', invoiceId)

    // Fetch invoice with all details including currency_code
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, remaining_balance, amount_paid, status, due_date, description, created_at, currency_code')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error('[invoices/public] Invoice not found:', invoiceError)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Fetch freelancer profile and payment details
    const { data: freelancer, error: freelancerError } = await supabase
      .from('profiles')
      .select('full_name, payment_method, stripe_account_id, stripe_onboarding_complete, country_code, currency_code')
      .eq('id', invoice.user_id)
      .single()

    if (freelancerError || !freelancer) {
      console.error('[invoices/public] Freelancer not found:', freelancerError)
      return NextResponse.json(
        { error: 'Freelancer not found' },
        { status: 404 }
      )
    }

    // Fetch payment details (bank account, DuitNow, etc.) if available
    const { data: paymentDetails } = await supabase
      .from('payment_details')
      .select('*')
      .eq('user_id', invoice.user_id)
      .single()

    console.log('[invoices/public] Invoice data:', {
      invoice_number: invoice.invoice_number,
      amount: invoice.amount,
      currency_code: invoice.currency_code,
      freelancer: freelancer.full_name
    })

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        remaining_balance: invoice.remaining_balance || invoice.amount,
        amount_paid: invoice.amount_paid || 0,
        status: invoice.status,
        due_date: invoice.due_date,
        description: invoice.description,
        created_at: invoice.created_at,
        currency_code: invoice.currency_code || 'MYR' // Fallback to MYR
      },
      freelancer: {
        full_name: freelancer.full_name,
        payment_method: freelancer.payment_method,
        stripe_account_id: freelancer.stripe_account_id,
        stripe_onboarding_complete: freelancer.stripe_onboarding_complete
      },
      paymentDetails: paymentDetails || null
    })
  } catch (error: any) {
    console.error('[invoices/public] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}
