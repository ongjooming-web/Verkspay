import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params

    // Verify authentication
    const { user, error: authError } = await requireAuth(request)
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      )
    }

    const userId = user.id
    const supabase = getSupabaseServer()

    // Parse request body
    const body = await request.json()
    const { amount, paymentMethod, paymentDate, notes } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Fetch the invoice to verify ownership and get current amounts
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Calculate new amounts
    const currentAmountPaid = invoice.amount_paid || 0
    const newAmountPaid = currentAmountPaid + amount
    const newRemainingBalance = Math.max(0, invoice.amount - newAmountPaid)

    // Determine new status
    let newStatus = invoice.status
    if (newAmountPaid >= invoice.amount) {
      newStatus = 'paid'
    } else if (newAmountPaid > 0) {
      newStatus = 'paid_partial'
    }

    // Create payment record
    // Parse paymentDate to YYYY-MM-DD format if provided, otherwise use today
    const finalPaymentDate = paymentDate 
      ? paymentDate.split('T')[0] // Extract just the date part if it's a full timestamp
      : new Date().toISOString().split('T')[0]

    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payment_records')
      .insert([
        {
          invoice_id: invoiceId,
          amount: amount,
          payment_date: finalPaymentDate,
          payment_method: paymentMethod || 'manual',
          notes: notes || null
        }
      ])
      .select()

    if (paymentError) {
      console.error('[record-payment] Error creating payment record:', paymentError)
      return NextResponse.json(
        { error: 'Failed to record payment' },
        { status: 500 }
      )
    }

    // Update invoice with new payment amounts and status
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        remaining_balance: newRemainingBalance,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('[record-payment] Error updating invoice:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Payment recorded successfully',
        payment: paymentRecord?.[0],
        invoice: {
          amount_paid: newAmountPaid,
          remaining_balance: newRemainingBalance,
          status: newStatus
        }
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[record-payment] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
