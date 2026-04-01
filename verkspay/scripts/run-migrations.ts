import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigrations() {
  try {
    console.log('Running Supabase migrations...')

    const migrationsDir = path.join(__dirname, '..', 'supabase-migrations')
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

    for (const file of files) {
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf-8')

      console.log(`Running migration: ${file}`)

      // Execute SQL using Supabase Admin API
      const { error } = await supabase.rpc('exec', { sql })

      if (error) {
        console.error(`Error running ${file}:`, error.message)
        // Don't fail on errors - migrations might already exist
      } else {
        console.log(`✓ ${file} completed`)
      }
    }

    console.log('Migrations completed!')
  } catch (err: any) {
    console.error('Migration error:', err)
    process.exit(1)
  }
}

runMigrations()
