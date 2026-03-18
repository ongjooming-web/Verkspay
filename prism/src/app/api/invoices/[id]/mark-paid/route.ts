import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    console.log('[mark-paid] Request received for invoice:', id)

    // Create Supabase client inside function to avoid build-time instantiation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.error('[mark-paid] No authorization header')
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
      console.error('[mark-paid] Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      )
    }

    const userId = user.id
    console.log('[mark-paid] Authenticated user:', userId)

    // Verify the user owns this invoice using service role
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (invoiceError || !invoice) {
      console.error('[mark-paid] Invoice not found:', invoiceError)
      return NextResponse.json(
        { error: 'Invoice not found or you do not have permission to modify it' },
        { status: 404 }
      )
    }

    console.log('[mark-paid] Found invoice:', invoice.id, 'Status:', invoice.status)

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      console.warn('[mark-paid] Invoice already paid')
      return NextResponse.json(
        { error: 'Invoice is already marked as paid' },
        { status: 400 }
      )
    }

    // Get user's payment info (wallet or Stripe)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address, stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single()

    // Determine payment recipient
    let recipientAddress = 'Unknown'
    let paymentMethod = 'manual'

    if (profile?.stripe_account_id && profile?.stripe_onboarding_complete) {
      // User has Stripe connected - use Stripe account ID as recipient
      paymentMethod = 'stripe'
      // Format: "Stripe Bank • acct_1TC7..."
      const accountIdLast8 = profile.stripe_account_id.slice(-8)
      recipientAddress = `Stripe Bank • ${profile.stripe_account_id.slice(0, 8)}${accountIdLast8}`
      console.log('[mark-paid] Stripe connected:', profile.stripe_account_id)
    } else if (profile?.wallet_address) {
      // Fallback to wallet (if no Stripe)
      paymentMethod = 'usd'
      recipientAddress = profile.wallet_address
      console.log('[mark-paid] Wallet connected:', profile.wallet_address)
    } else {
      console.error('[mark-paid] No payment method connected')
      console.log('[mark-paid] Profile data:', { stripe_account_id: profile?.stripe_account_id, stripe_onboarding_complete: profile?.stripe_onboarding_complete, wallet_address: profile?.wallet_address })
      return NextResponse.json(
        { error: 'No payment method connected. Please connect Stripe in Settings.' },
        { status: 400 }
      )
    }

    console.log('[mark-paid] Payment method:', paymentMethod, 'Recipient:', recipientAddress)

    // Generate transaction hash for testing
    const timestamp = Date.now()
    const transactionHash = `manual-test-${timestamp}`

    // Update invoice to paid
    console.log('[mark-paid] Updating invoice to paid status...')
    const updatePayload = {
      status: 'paid',
      paid_date: new Date().toISOString(),
      payment_method: paymentMethod,
      payment_recipient: recipientAddress,
      updated_at: new Date().toISOString()
    }
    console.log('[mark-paid] Update payload:', updatePayload)
    
    const { error: updateError, data: updateData } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()

    if (updateError) {
      console.error('[mark-paid] Invoice update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice status: ' + updateError.message },
        { status: 500 }
      )
    }

    console.log('[mark-paid] Invoice update returned:', updateData)
    console.log('[mark-paid] Invoice updated successfully')

    // Fetch updated invoice to verify
    const { data: updatedInvoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !updatedInvoice) {
      console.error('[mark-paid] Failed to fetch updated invoice:', fetchError)
      return NextResponse.json(
        { error: 'Failed to verify invoice update' },
        { status: 500 }
      )
    }

    // Verify status change
    if (updatedInvoice.status !== 'paid') {
      console.error('[mark-paid] Status verification failed. Expected: paid, Got:', updatedInvoice.status)
      return NextResponse.json(
        { error: 'Invoice status update verification failed' },
        { status: 500 }
      )
    }

    console.log('[mark-paid] Status verified as paid. Returning success.')

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: 'Invoice marked as paid'
    }, { status: 200 })
  } catch (error: any) {
    console.error('[mark-paid] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
