import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    console.log('[invoices/public] Fetching public invoice:', id)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Fetch invoice with user profile info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      console.error('[invoices/public] Invoice not found:', invoiceError)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Don't allow viewing paid invoices via public link
    if (invoice.status === 'paid') {
      console.warn('[invoices/public] Invoice already paid')
      return NextResponse.json(
        { error: 'This invoice has already been paid' },
        { status: 400 }
      )
    }

    // Fetch freelancer profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, payment_method, stripe_account_id, stripe_onboarding_complete')
      .eq('id', invoice.user_id)
      .single()

    if (profileError || !profile) {
      console.error('[invoices/public] Profile not found:', profileError)
      return NextResponse.json(
        { error: 'Freelancer profile not found' },
        { status: 404 }
      )
    }

    // Fetch line items if they exist
    const { data: lineItems } = await supabase
      .from('line_items')
      .select('*')
      .eq('invoice_id', id)

    console.log('[invoices/public] Found invoice:', id, 'Status:', invoice.status)

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        due_date: invoice.due_date,
        description: invoice.description,
        status: invoice.status,
        created_at: invoice.created_at,
        line_items: lineItems || []
      },
      freelancer: {
        full_name: profile.full_name,
        payment_method: profile.payment_method,
        stripe_account_id: profile.stripe_account_id,
        stripe_onboarding_complete: profile.stripe_onboarding_complete
      }
    }, { status: 200 })
  } catch (error: any) {
    console.error('[invoices/public] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
