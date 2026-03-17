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
    console.log('[mark-paid] Request received for invoice:', id)

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

    // Get user's wallet address
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('id', userId)
      .single()

    if (!profile?.wallet_address) {
      console.error('[mark-paid] No wallet address found')
      return NextResponse.json(
        { error: 'Wallet not connected. Please connect a wallet in Settings.' },
        { status: 400 }
      )
    }

    console.log('[mark-paid] Wallet address found')

    // Generate transaction hash for testing
    const timestamp = Date.now()
    const transactionHash = `manual-test-${timestamp}`

    // Update invoice to paid
    console.log('[mark-paid] Updating invoice to paid status...')
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
      console.error('[mark-paid] Invoice update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice status: ' + updateError.message },
        { status: 500 }
      )
    }

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
