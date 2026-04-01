import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Check environment variables
console.log('[Delete Init] Checking environment variables...')
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('[Delete Init] NEXT_PUBLIC_SUPABASE_URL is not set')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Delete Init] SUPABASE_SERVICE_ROLE_KEY is not set - account deletion will fail')
} else {
  console.log('[Delete Init] Service role key found, first 10 chars:', process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10))
}

// Admin client for deletion (service role key - server-side only)
console.log('[Delete Init] Creating Supabase admin client with service role key...')
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
console.log('[Delete Init] Admin client created')

// User-authenticated client for token verification
const supabaseUser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

interface DeleteRequest {
  email: string
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  console.log(`[Delete] POST /api/account/delete - Request started at ${new Date().toISOString()}`)

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get('Authorization')
    console.log('[Delete] Auth header present:', !!authHeader)
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[Delete] Missing or invalid Authorization header')
      return NextResponse.json(
        { error: 'Unauthorized - missing token' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    console.log('[Delete] Token extracted, length:', token.length)

    // 2. Verify JWT token and get user
    console.log('[Delete] Verifying JWT token...')
    const { data, error: authError } = await supabaseUser.auth.getUser(token)
    const user = data?.user

    if (authError || !user) {
      console.error('[Delete] Token verification failed:', authError?.message || 'No user in token')
      return NextResponse.json(
        { error: 'Unauthorized - invalid token', details: authError?.message },
        { status: 401 }
      )
    }

    const userId = user.id
    const userEmail = user.email

    console.log('[Delete] ✓ User authenticated:', userId, userEmail)

    // 3. Verify email confirmation
    console.log('[Delete] Parsing request body...')
    let emailFromBody: string | null = null
    try {
      const body = await req.json() as DeleteRequest
      emailFromBody = body.email
      console.log('[Delete] Email from body:', emailFromBody)
    } catch (err) {
      console.error('[Delete] Failed to parse request body:', err)
      return NextResponse.json(
        { error: 'Invalid request body', details: err instanceof Error ? err.message : String(err) },
        { status: 400 }
      )
    }

    if (emailFromBody !== userEmail) {
      console.error('[Delete] Email mismatch:', { provided: emailFromBody, actual: userEmail })
      return NextResponse.json(
        { error: 'Email confirmation does not match' },
        { status: 403 }
      )
    }
    
    console.log('[Delete] ✓ Email confirmed, proceeding with deletion')

    // 4. Delete user data in correct order (respecting foreign keys)
    
    // Step 1: Get all invoice IDs for this user (needed to delete payment_records)
    console.log('[Delete] Fetching invoice IDs...')
    const { data: invoices, error: invoicesFetchErr } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('user_id', userId)
    if (invoicesFetchErr) {
      console.error('[Delete] Failed to fetch invoices:', invoicesFetchErr)
      throw new Error(`Failed to fetch invoices: ${invoicesFetchErr.message}`)
    }
    const invoiceIds = invoices?.map(inv => inv.id) || []
    console.log(`[Delete] Found ${invoiceIds.length} invoices`)

    // Step 2: Delete payment_records (linked via invoice_id, NOT user_id)
    if (invoiceIds.length > 0) {
      console.log('[Delete] Deleting payment_records for user invoices...')
      const { error: err1 } = await supabaseAdmin
        .from('payment_records')
        .delete()
        .in('invoice_id', invoiceIds)
      if (err1) {
        console.error('[Delete] Failed to delete payment_records:', err1)
        throw new Error(`Failed to delete payment_records: ${err1.message}`)
      }
    }

    // Step 3: Delete payment_intents (linked via invoice_id)
    if (invoiceIds.length > 0) {
      console.log('[Delete] Deleting payment_intents for user invoices...')
      const { error: err2 } = await supabaseAdmin
        .from('payment_intents')
        .delete()
        .in('invoice_id', invoiceIds)
      if (err2) {
        console.error('[Delete] Failed to delete payment_intents:', err2)
        throw new Error(`Failed to delete payment_intents: ${err2.message}`)
      }
    }

    // Step 4: Delete reminders_log (linked via invoice_id)
    if (invoiceIds.length > 0) {
      console.log('[Delete] Deleting reminders_log for user invoices...')
      const { error: err3 } = await supabaseAdmin
        .from('reminders_log')
        .delete()
        .in('invoice_id', invoiceIds)
      if (err3) {
        console.error('[Delete] Failed to delete reminders_log:', err3)
        throw new Error(`Failed to delete reminders_log: ${err3.message}`)
      }
    }

    // Step 5: Delete proposals (linked via user_id)
    console.log('[Delete] Deleting proposals...')
    const { error: err4 } = await supabaseAdmin
      .from('proposals')
      .delete()
      .eq('user_id', userId)
    if (err4) {
      console.error('[Delete] Failed to delete proposals:', err4)
      throw new Error(`Failed to delete proposals: ${err4.message}`)
    }

    // Step 6: Delete recurring_invoices (linked via user_id)
    console.log('[Delete] Deleting recurring_invoices...')
    const { error: err5 } = await supabaseAdmin
      .from('recurring_invoices')
      .delete()
      .eq('user_id', userId)
    if (err5) {
      console.error('[Delete] Failed to delete recurring_invoices:', err5)
      throw new Error(`Failed to delete recurring_invoices: ${err5.message}`)
    }

    // Step 7: Delete invoices (linked via user_id)
    console.log('[Delete] Deleting invoices...')
    const { error: err6 } = await supabaseAdmin
      .from('invoices')
      .delete()
      .eq('user_id', userId)
    if (err6) {
      console.error('[Delete] Failed to delete invoices:', err6)
      throw new Error(`Failed to delete invoices: ${err6.message}`)
    }

    // Step 8: Delete contracts (linked via user_id)
    console.log('[Delete] Deleting contracts...')
    const { error: err7 } = await supabaseAdmin
      .from('contracts')
      .delete()
      .eq('user_id', userId)
    if (err7) {
      console.error('[Delete] Failed to delete contracts:', err7)
      throw new Error(`Failed to delete contracts: ${err7.message}`)
    }

    // Step 9: Delete clients (linked via user_id)
    console.log('[Delete] Deleting clients...')
    const { error: err8 } = await supabaseAdmin
      .from('clients')
      .delete()
      .eq('user_id', userId)
    if (err8) {
      console.error('[Delete] Failed to delete clients:', err8)
      throw new Error(`Failed to delete clients: ${err8.message}`)
    }

    // Step 10: Delete profile (primary user record)
    console.log('[Delete] Deleting profile...')
    const { error: err9 } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    if (err9) {
      console.error('[Delete] Failed to delete profile:', err9)
      throw new Error(`Failed to delete profile: ${err9.message}`)
    }

    // 5. Delete auth user
    console.log('[Delete] Deleting auth user...')
    console.log('[Delete] Admin client has auth.admin:', !!supabaseAdmin.auth.admin)
    console.log('[Delete] Admin client has auth.admin.deleteUser:', !!supabaseAdmin.auth.admin.deleteUser)
    console.log('[Delete] Service role key being used (first 10 chars):', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10))
    
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authDeleteError) {
      console.error('[Delete] Warning - failed to delete auth user:', {
        message: authDeleteError.message,
        status: (authDeleteError as any).status,
        code: (authDeleteError as any).code,
        error: (authDeleteError as any).error
      })
      // Don't throw - auth user deletion can fail after data is already gone
    } else {
      console.log('[Delete] Auth user deleted successfully')
    }

    console.log('[Delete] ✅ Account deleted successfully:', userId, userEmail)
    const duration = Date.now() - startTime
    console.log(`[Delete] Total duration: ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Your account has been permanently deleted',
      redirect_url: '/goodbye'
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal server error'
    console.error('[Delete] ❌ Error during account deletion:', errorMsg)
    console.error('[Delete] Stack:', error instanceof Error ? error.stack : 'N/A')
    
    const duration = Date.now() - startTime
    console.log(`[Delete] Failed after ${duration}ms`)

    return NextResponse.json(
      { 
        error: errorMsg,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
