import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      )
    }

    // Verify auth
    const { user, error: authError } = await requireAuth(req)
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      )
    }

    // Ensure user can only delete their own account
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot delete another user account' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseServer()

    console.log('[auth/delete-account] Starting deletion for user:', userId)

    // Delete all invoices for this user
    const { error: invoicesError } = await supabase
      .from('invoices')
      .delete()
      .eq('user_id', userId)

    if (invoicesError) {
      console.error('[auth/delete-account] Failed to delete invoices:', invoicesError)
      return NextResponse.json(
        { error: 'Failed to delete invoices' },
        { status: 500 }
      )
    }

    // Delete all clients for this user
    const { error: clientsError } = await supabase
      .from('clients')
      .delete()
      .eq('user_id', userId)

    if (clientsError) {
      console.error('[auth/delete-account] Failed to delete clients:', clientsError)
      return NextResponse.json(
        { error: 'Failed to delete clients' },
        { status: 500 }
      )
    }

    // Delete user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('[auth/delete-account] Failed to delete profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to delete profile' },
        { status: 500 }
      )
    }

    // Delete the Supabase auth user
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('[auth/delete-account] Failed to delete auth user:', authDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete authentication account' },
        { status: 500 }
      )
    }

    console.log('[auth/delete-account] ✓ Account deleted successfully:', userId)

    return NextResponse.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted'
    }, { status: 200 })
  } catch (error: any) {
    console.error('[auth/delete-account] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
