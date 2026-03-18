import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await context.params
    const { amount, paymentMethod, paymentDate, notes } = await req.json()

    console.log('[invoices/record-payment] Recording payment for invoice:', invoiceId)
    console.log('[invoices/record-payment] Amount:', amount, 'Method:', paymentMethod)

    // Verify auth
    const { user, error: authError } = await requireAuth(req)
    if (authError) {
      console.error('[invoices/record-payment] Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      )
    }

    const userId = user.id
    const supabase = getSupabaseServer()

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single()

    if (invoiceError || !invoice) {
      console.error('[invoices/record-payment] Invoice not found:', invoiceError)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Calculate new totals
    const newAmountPaid = (invoice.amount_paid || 0) + amount
    const newRemainingBalance = invoice.amount - newAmountPaid

    // Determine new status
    let newStatus = 'unpaid'
    if (newAmountPaid >= invoice.amount) {
      newStatus = 'paid'
    } else if (newAmountPaid > 0) {
      newStatus = 'paid_partial'
    }

    console.log('[invoices/record-payment] New amount_paid:', newAmountPaid, 'Status:', newStatus)

    // Record payment in payment_records table
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payment_records')
      .insert([
        {
          invoice_id: invoiceId,
          amount: amount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          notes: notes || null
        }
      ])
      .select()

    if (paymentError) {
      console.error('[invoices/record-payment] Failed to record payment:', paymentError)
      return NextResponse.json(
        { error: 'Failed to record payment' },
        { status: 500 }
      )
    }

    // Update invoice with new amounts and status
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        remaining_balance: Math.max(0, newRemainingBalance),
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()

    if (updateError) {
      console.error('[invoices/record-payment] Failed to update invoice:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      )
    }

    console.log('[invoices/record-payment] ✓ Payment recorded successfully')

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice[0],
      paymentRecord: paymentRecord[0],
      message: `Payment of $${amount.toFixed(2)} recorded successfully`
    }, { status: 200 })
  } catch (error: any) {
    console.error('[invoices/record-payment] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
