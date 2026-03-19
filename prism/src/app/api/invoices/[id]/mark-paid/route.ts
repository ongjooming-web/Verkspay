import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params
    const { amount, payment_method } = await request.json()

    console.log(`[mark-paid] Marking invoice ${invoiceId} as paid, amount: $${amount}`)

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID required' },
        { status: 400 }
      )
    }

    // Fetch invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('amount, amount_paid, status')
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Determine if this is a partial or full payment
    const newAmountPaid = amount || invoice.amount
    const remainingBalance = Math.max(0, invoice.amount - newAmountPaid)
    const newStatus = remainingBalance <= 0 ? 'paid' : 'paid_partial'

    console.log(`[mark-paid] Updating: amount_paid=$${newAmountPaid}, remaining=$${remainingBalance}, status=${newStatus}`)

    // Update invoice
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        remaining_balance: remainingBalance,
        status: newStatus,
        paid_date: newStatus === 'paid' ? new Date().toISOString() : null,
        payment_method: payment_method || 'stripe',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    if (updateError) {
      console.error(`[mark-paid] Update failed:`, updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      )
    }

    // Create payment record
    const { error: paymentRecordError } = await supabase
      .from('payment_records')
      .insert({
        invoice_id: invoiceId,
        amount: newAmountPaid,
        payment_method: payment_method || 'stripe',
        payment_date: new Date().toISOString(),
        notes: 'Payment marked as paid via payment success page',
        created_at: new Date().toISOString(),
      })

    if (paymentRecordError) {
      console.error('[mark-paid] Error creating payment record:', paymentRecordError)
    }

    console.log(`[mark-paid] Invoice ${invoiceId} marked as ${newStatus}`)

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoiceId,
        amount_paid: newAmountPaid,
        remaining_balance: remainingBalance,
        status: newStatus,
      }
    })
  } catch (error) {
    console.error('[mark-paid] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
