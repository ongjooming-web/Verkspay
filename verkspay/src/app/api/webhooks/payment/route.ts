import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''

/**
 * WEBHOOK RECEIVER - Phase 3 Step 2
 * 
 * This endpoint receives payment notifications from Alchemy Webhooks.
 * Currently a placeholder. Will be fully implemented in Step 2.
 * 
 * When activated in Step 2, this will:
 * 1. Verify webhook signature from Alchemy
 * 2. Parse token transfer events
 * 3. Match to payment_intents by wallet address and amount
 * 4. Mark invoices as paid automatically
 * 5. Update payment records
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log webhook for debugging (Phase 2: add Alchemy signature verification)
    console.log('Webhook received (Phase 2 implementation pending):', {
      timestamp: new Date().toISOString(),
      bodyType: body.type || 'unknown',
      hasEvent: !!body.event
    })

    // PHASE 2: Uncomment and implement the following:
    /*
    // Step 1: Verify Alchemy signature
    const alchemySignature = request.headers.get('x-alchemy-signature')
    if (!alchemySignature) {
      return NextResponse.json({ error: 'No signature' }, { status: 401 })
    }

    const verified = verifyAlchemySignature(body, alchemySignature)
    if (!verified) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Step 2: Extract transaction data
    const { event } = body
    if (!event?.activity || event.activity.length === 0) {
      return NextResponse.json({ success: true })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 3: Process each transfer
    for (const activity of event.activity) {
      const { to: recipientAddress, value: amountSmallest, txHash } = activity

      // Convert from smallest unit (6 decimals for USDC)
      const amountUsdc = parseInt(amountSmallest) / 1e6

      // Find matching payment intent
      const { data: intent } = await supabase
        .from('payment_intents')
        .select('*, invoices(id, user_id)')
        .eq('wallet_address', recipientAddress)
        .eq('amount_usdc', amountUsdc)
        .eq('status', 'pending')
        .single()

      if (intent) {
        // Step 4: Update payment intent
        await supabase
          .from('payment_intents')
          .update({
            status: 'completed',
            tx_hash: txHash,
            completed_at: new Date().toISOString()
          })
          .eq('id', intent.id)

        // Step 5: Update invoice (trigger handles this automatically)
        // The mark_invoice_as_paid_by_intent trigger will run
      }
    }
    */

    return NextResponse.json({
      success: true,
      message: 'Webhook received. Payment processing will be enabled in Phase 3 Step 2.'
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PHASE 2: Add this function
 * 
 * function verifyAlchemySignature(body: any, signature: string): boolean {
 *   const crypto = require('crypto')
 *   const secret = process.env.ALCHEMY_WEBHOOK_SECRET || ''
 *   
 *   const hash = crypto
 *     .createHmac('sha256', secret)
 *     .update(JSON.stringify(body))
 *     .digest('hex')
 *   
 *   return hash === signature
 * }
 */
