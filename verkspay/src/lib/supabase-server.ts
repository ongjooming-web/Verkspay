/**
 * Server-side Supabase client using SERVICE_ROLE_KEY
 * Use this in all API routes for database operations
 * Never use the anon client in server routes
 */

import { createClient } from '@supabase/supabase-js'

export function getSupabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export function getSupabaseAuth() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
