import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authorization header' },
        { status: 401 }
      )
    }

    // Create client with the user's auth token
    const token = authHeader.replace('Bearer ', '')
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: {
          headers: {
            authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: authError
    } = await userClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Verify the user owns this invoice using service role
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or you do not have permission to modify it' },
        { status: 404 }
      )
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already marked as paid' },
        { status: 400 }
      )
    }

    // Get user's wallet address
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address, usdc_network')
      .eq('id', userId)
      .single()

    if (!profile?.wallet_address) {
      return NextResponse.json(
        { error: 'Wallet not connected. Please connect a wallet in Settings.' },
        { status: 400 }
      )
    }

    // Generate transaction hash for testing
    const timestamp = Date.now()
    const transactionHash = `manual-test-${timestamp}`

    // Begin transaction: Update invoice and create/update payment_intent
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString(),
        payment_method: 'usdc',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Invoice update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice status' },
        { status: 500 }
      )
    }

    // Check if payment_intent exists
    const { data: existingIntent } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('invoice_id', id)
      .single()

    let paymentIntent
    if (existingIntent) {
      // Update existing payment_intent
      const { data: updatedIntent, error: updateIntentError } = await supabase
        .from('payment_intents')
        .update({
          status: 'paid',
          transaction_hash: transactionHash,
          wallet_address: profile.wallet_address,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingIntent.id)
        .select()
        .single()

      if (updateIntentError) {
        console.error('Payment intent update error:', updateIntentError)
        return NextResponse.json(
          { error: 'Failed to update payment intent' },
          { status: 500 }
        )
      }
      paymentIntent = updatedIntent
    } else {
      // Create new payment_intent
      const { data: newIntent, error: createIntentError } = await supabase
        .from('payment_intents')
        .insert([
          {
            user_id: userId,
            invoice_id: id,
            wallet_address: profile.wallet_address,
            amount_usdc: invoice.amount,
            network: profile.usdc_network || 'base',
            status: 'paid',
            transaction_hash: transactionHash,
            completed_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (createIntentError) {
        console.error('Payment intent create error:', createIntentError)
        return NextResponse.json(
          { error: 'Failed to create payment intent' },
          { status: 500 }
        )
      }
      paymentIntent = newIntent
    }

    // Return updated invoice
    const { data: updatedInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      paymentIntent: paymentIntent,
      message: 'Invoice marked as paid'
    })
  } catch (error: any) {
    console.error('Mark as paid error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
