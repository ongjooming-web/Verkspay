import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, network, enabled } = body

    if (action === 'enable') {
      // Create or update webhook configuration
      const webhookConfig = {
        user_id: user.id,
        network: network || 'base',
        enabled: enabled !== undefined ? enabled : true,
        webhook_id: `webhook_${user.id}_${network || 'base'}_${Date.now()}`,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/payment`,
      }

      const { data, error } = await supabase
        .from('webhook_config')
        .upsert([webhookConfig], {
          onConflict: 'user_id,network'
        })
        .select()
        .single()

      if (error) {
        console.error('Webhook config error:', error)
        return NextResponse.json({ error: 'Failed to configure webhook' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Webhook configuration will be enabled in Phase 3 Step 2',
        data: {
          webhook_id: data.webhook_id,
          network: data.network,
          enabled: false // Keep disabled for now
        }
      })
    } else if (action === 'disable') {
      // Disable webhook
      const { error } = await supabase
        .from('webhook_config')
        .update({ enabled: false })
        .eq('user_id', user.id)
        .eq('network', network || 'base')

      if (error) {
        return NextResponse.json({ error: 'Failed to disable webhook' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Webhook disabled'
      })
    } else if (action === 'get') {
      // Get webhook configuration
      const { data, error } = await supabase
        .from('webhook_config')
        .select('*')
        .eq('user_id', user.id)
        .eq('network', network || 'base')
        .single()

      if (error?.code === 'PGRST116') {
        // No config found
        return NextResponse.json({
          success: true,
          data: null
        })
      }

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch webhook config' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Webhook config error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * WEBHOOK CONFIGURATION DOCUMENTATION
 * 
 * This endpoint manages webhook configurations for Phase 3 Step 2.
 * 
 * REQUEST BODY (POST):
 * {
 *   "action": "enable" | "disable" | "get",
 *   "network": "base" | "ethereum" | "solana",
 *   "enabled": boolean (optional, for enable action)
 * }
 * 
 * WEBHOOK STRUCTURE (For Step 2 Implementation):
 * 
 * The webhook will receive payment notifications from Alchemy in this format:
 * 
 * {
 *   "type": "token_transfer",
 *   "event": {
 *     "network": "base-mainnet",
 *     "activity": [{
 *       "txHash": "0x...",
 *       "blockNum": "0x...",
 *       "from": "0x...",
 *       "to": "0x... (recipient - our wallet)",
 *       "value": 1000000,  // USDC in smallest unit (6 decimals)
 *       "erc721TokenId": null,
 *       "erc1155Metadata": null,
 *       "tokenId": null,
 *       "asset": "USDC",
 *       "category": "token",
 *       "rawContract": {
 *         "value": "1000000",
 *         "decimal": "6",
 *         "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
 *       },
 *       "log": {
 *         "address": "0x...",
 *         "topics": ["0x..."],
 *         "data": "0x...",
 *         "blockNumber": "0x...",
 *         "transactionHash": "0x...",
 *         "transactionIndex": "0x...",
 *         "blockHash": "0x...",
 *         "logIndex": "0x...",
 *         "removed": false
 *       },
 *       "transactionIndex": 42,
 *       "logIndex": 127
 *     }]
 *   }
 * }
 * 
 * PAYMENT INTENT MATCHING:
 * - Query payment_intents table by wallet_address and amount
 * - Update status from 'pending' to 'completed'
 * - Set tx_hash to transaction hash
 * - Trigger invoice status update (automatic via trigger)
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "data": {
 *     "webhook_id": "webhook_...",
 *     "network": "base",
 *     "enabled": false  // Currently disabled, Phase 2 will activate
 *   }
 * }
 */
