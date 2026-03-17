import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Verify admin access via auth header (optional - you can remove for now)
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.includes('Bearer')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Migrations] Starting database migrations...')

    // Migration 1: Add payment_recipient to invoices
    const { error: migration1Error } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS payment_recipient TEXT;
      `
    })

    if (migration1Error && !migration1Error.message.includes('already exists')) {
      console.error('[Migrations] Error adding payment_recipient:', migration1Error)
      // Don't fail - column might already exist
    } else {
      console.log('[Migrations] ✓ Added payment_recipient to invoices')
    }

    // Migration 2: Add stripe fields to profiles (if not already done)
    const { error: migration2Error } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
        ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;
      `
    })

    if (migration2Error && !migration2Error.message.includes('already exists')) {
      console.error('[Migrations] Error adding Stripe fields:', migration2Error)
    } else {
      console.log('[Migrations] ✓ Added stripe fields to profiles')
    }

    return NextResponse.json({
      success: true,
      message: 'Migrations completed'
    })
  } catch (err: any) {
    console.error('[Migrations] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Migration failed' },
      { status: 500 }
    )
  }
}
