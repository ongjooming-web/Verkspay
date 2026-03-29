import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin client for deletion (service role key - server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// User-authenticated client for token verification
const supabaseUser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface DeleteRequest {
  email: string
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[Delete] Missing or invalid Authorization header')
      return NextResponse.json(
        { error: 'Unauthorized - missing token' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. Verify JWT token and get user
    const { data, error: authError } = await supabaseUser.auth.getUser(token)
    const user = data?.user

    if (authError || !user) {
      console.error('[Delete] Token verification failed:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      )
    }

    const userId = user.id
    const userEmail = user.email

    console.log('[Delete] Starting account deletion for:', userId, userEmail)

    // 3. Verify email confirmation
    let emailFromBody: string | null = null
    try {
      const body = await req.json() as DeleteRequest
      emailFromBody = body.email
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
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

    // 4. Delete user data in order (respecting foreign keys)
    console.log('[Delete] Deleting client_notes...')
    const { error: err1 } = await supabaseAdmin
      .from('client_notes')
      .delete()
      .eq('user_id', userId)
    if (err1) {
      console.error('[Delete] Failed to delete client_notes:', err1)
      throw new Error(`Failed to delete client_notes: ${err1.message}`)
    }

    console.log('[Delete] Deleting client_follow_ups...')
    const { error: err2 } = await supabaseAdmin
      .from('client_follow_ups')
      .delete()
      .eq('user_id', userId)
    if (err2) {
      console.error('[Delete] Failed to delete client_follow_ups:', err2)
      throw new Error(`Failed to delete client_follow_ups: ${err2.message}`)
    }

    console.log('[Delete] Deleting proposals...')
    const { error: err3 } = await supabaseAdmin
      .from('proposals')
      .delete()
      .eq('user_id', userId)
    if (err3) {
      console.error('[Delete] Failed to delete proposals:', err3)
      throw new Error(`Failed to delete proposals: ${err3.message}`)
    }

    console.log('[Delete] Deleting recurring_invoices...')
    const { error: err4 } = await supabaseAdmin
      .from('recurring_invoices')
      .delete()
      .eq('user_id', userId)
    if (err4) {
      console.error('[Delete] Failed to delete recurring_invoices:', err4)
      throw new Error(`Failed to delete recurring_invoices: ${err4.message}`)
    }

    console.log('[Delete] Deleting payment_records...')
    const { error: err5 } = await supabaseAdmin
      .from('payment_records')
      .delete()
      .eq('user_id', userId)
    if (err5) {
      console.error('[Delete] Failed to delete payment_records:', err5)
      throw new Error(`Failed to delete payment_records: ${err5.message}`)
    }

    console.log('[Delete] Deleting payment_intents...')
    const { error: err6 } = await supabaseAdmin
      .from('payment_intents')
      .delete()
      .eq('user_id', userId)
    if (err6) {
      console.error('[Delete] Failed to delete payment_intents:', err6)
      throw new Error(`Failed to delete payment_intents: ${err6.message}`)
    }

    console.log('[Delete] Deleting webhook_config...')
    const { error: err7 } = await supabaseAdmin
      .from('webhook_config')
      .delete()
      .eq('user_id', userId)
    if (err7) {
      console.error('[Delete] Failed to delete webhook_config:', err7)
      throw new Error(`Failed to delete webhook_config: ${err7.message}`)
    }

    console.log('[Delete] Deleting invoices...')
    const { error: err8 } = await supabaseAdmin
      .from('invoices')
      .delete()
      .eq('user_id', userId)
    if (err8) {
      console.error('[Delete] Failed to delete invoices:', err8)
      throw new Error(`Failed to delete invoices: ${err8.message}`)
    }

    console.log('[Delete] Deleting clients...')
    const { error: err9 } = await supabaseAdmin
      .from('clients')
      .delete()
      .eq('user_id', userId)
    if (err9) {
      console.error('[Delete] Failed to delete clients:', err9)
      throw new Error(`Failed to delete clients: ${err9.message}`)
    }

    console.log('[Delete] Deleting profile...')
    const { error: err10 } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    if (err10) {
      console.error('[Delete] Failed to delete profile:', err10)
      throw new Error(`Failed to delete profile: ${err10.message}`)
    }

    // 5. Delete auth user
    console.log('[Delete] Deleting auth user...')
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authDeleteError) {
      console.error('[Delete] Warning - failed to delete auth user:', authDeleteError)
      // Don't throw - auth user deletion can fail after data is already gone
    } else {
      console.log('[Delete] Auth user deleted successfully')
    }

    console.log('[Delete] Account deleted successfully:', userId, userEmail)

    return NextResponse.json({
      success: true,
      message: 'Your account has been permanently deleted',
      redirect_url: '/goodbye'
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal server error'
    console.error('[Delete] Error during account deletion:', errorMsg)

    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    )
  }
}
