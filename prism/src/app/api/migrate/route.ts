import { Client } from 'pg'
import { NextRequest, NextResponse } from 'next/server'

const MIGRATION_SECRET = process.env.MIGRATION_SECRET

export async function POST(req: NextRequest) {
  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization')
    if (!MIGRATION_SECRET || authHeader !== `Bearer ${MIGRATION_SECRET}`) {
      console.error('[Migrate] Unauthorized - invalid or missing secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      console.error('[Migrate] DATABASE_URL not set')
      return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 })
    }

    console.log('[Migrate] Starting migrations...')

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } as any
    })

    await client.connect()
    console.log('[Migrate] Connected to database')

    const migrations = [
      'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_recipient TEXT',
      'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT',
      'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false',
      'CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id ON profiles(stripe_account_id)'
    ]

    const results: any[] = []

    for (const sql of migrations) {
      try {
        console.log(`[Migrate] Running: ${sql.substring(0, 50)}...`)
        await client.query(sql)
        results.push({ sql: sql.substring(0, 80), status: 'ok' })
        console.log(`[Migrate] ✓ Success`)
      } catch (error: any) {
        console.error(`[Migrate] Error: ${error.message}`)
        // Don't fail - some migrations might already exist
        results.push({ sql: sql.substring(0, 80), status: 'skipped', error: error.message })
      }
    }

    await client.end()
    console.log('[Migrate] Migrations completed')

    return NextResponse.json({
      success: true,
      message: 'Migrations completed',
      results
    })
  } catch (error: any) {
    console.error('[Migrate] Fatal error:', error)
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    )
  }
}
