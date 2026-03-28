import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { sendEmail } from '@/lib/resend'

export async function DELETE(req: NextRequest) {
  try {
    console.log('[account/delete] DELETE request received')
    const authHeader = req.headers.get('authorization')
    console.log('[account/delete] Auth header:', authHeader ? 'Present' : 'Missing')

    let emailFromBody: string | null = null
    try {
      const body = await req.json()
      emailFromBody = body.email
      console.log('[account/delete] Email from body:', emailFromBody)
    } catch (parseErr) {
      console.error('[account/delete] Failed to parse request body:', parseErr)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    if (!emailFromBody) {
      console.log('[account/delete] Email missing from request body')
      return NextResponse.json(
        { error: 'Email confirmation is required' },
        { status: 400 }
      )
    }

    // Verify auth
    console.log('[account/delete] Verifying auth...')
    const { user, error: authError } = await requireAuth(req)
    
    if (authError) {
      console.error('[account/delete] Auth error:', authError)
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: authError.status || 401 }
      )
    }

    if (!user) {
      console.error('[account/delete] User object is null after auth')
      return NextResponse.json(
        { error: 'User not found after authentication' },
        { status: 401 }
      )
    }

    const userId = user.id
    const userEmail = user.email
    console.log('[account/delete] Auth successful. User:', userId, 'Email:', userEmail)

    // Verify email confirmation matches
    if (emailFromBody !== userEmail) {
      console.warn('[account/delete] Email mismatch. Expected:', userEmail, 'Got:', emailFromBody)
      return NextResponse.json(
        { error: 'Email confirmation does not match' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServer()

    console.log('[account/delete] Starting account deletion for user:', userId)

    // Step 1: Get all invoice IDs for this user (needed for reminders_log cleanup)
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', userId)

    if (invoicesError) {
      console.error('[account/delete] Failed to fetch invoices:', invoicesError)
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      )
    }

    const invoiceIds = invoices?.map(inv => inv.id) || []

    // Step 2: Delete reminders_log entries for user's invoices (must be first due to foreign key)
    if (invoiceIds.length > 0) {
      const { error: remindersError } = await supabase
        .from('reminders_log')
        .delete()
        .in('invoice_id', invoiceIds)

      if (remindersError) {
        console.error('[account/delete] Failed to delete reminders_log:', remindersError)
        return NextResponse.json(
          { error: 'Failed to delete reminders' },
          { status: 500 }
        )
      }
      console.log('[account/delete] ✓ Deleted reminders_log entries')
    }

    // Step 3: Delete payment_records
    const { error: paymentRecordsError } = await supabase
      .from('payment_records')
      .delete()
      .eq('user_id', userId)

    if (paymentRecordsError) {
      console.error('[account/delete] Failed to delete payment_records:', paymentRecordsError)
      return NextResponse.json(
        { error: 'Failed to delete payment records' },
        { status: 500 }
      )
    }
    console.log('[account/delete] ✓ Deleted payment_records')

    // Step 4: Delete payment_methods
    const { error: paymentMethodsError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('user_id', userId)

    if (paymentMethodsError) {
      console.error('[account/delete] Failed to delete payment_methods:', paymentMethodsError)
      return NextResponse.json(
        { error: 'Failed to delete payment methods' },
        { status: 500 }
      )
    }
    console.log('[account/delete] ✓ Deleted payment_methods')

    // Step 5: Delete invoices
    const { error: invoicesDeleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('user_id', userId)

    if (invoicesDeleteError) {
      console.error('[account/delete] Failed to delete invoices:', invoicesDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete invoices' },
        { status: 500 }
      )
    }
    console.log('[account/delete] ✓ Deleted invoices')

    // Step 6: Delete clients
    const { error: clientsError } = await supabase
      .from('clients')
      .delete()
      .eq('user_id', userId)

    if (clientsError) {
      console.error('[account/delete] Failed to delete clients:', clientsError)
      return NextResponse.json(
        { error: 'Failed to delete clients' },
        { status: 500 }
      )
    }
    console.log('[account/delete] ✓ Deleted clients')

    // Step 7: Delete proposals
    const { error: proposalsError } = await supabase
      .from('proposals')
      .delete()
      .eq('user_id', userId)

    if (proposalsError) {
      console.error('[account/delete] Failed to delete proposals:', proposalsError)
      return NextResponse.json(
        { error: 'Failed to delete proposals' },
        { status: 500 }
      )
    }
    console.log('[account/delete] ✓ Deleted proposals')

    // Step 8: Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('[account/delete] Failed to delete profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to delete profile' },
        { status: 500 }
      )
    }
    console.log('[account/delete] ✓ Deleted profile')

    // Step 9: Delete Supabase auth user
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('[account/delete] Failed to delete auth user:', authDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete authentication account' },
        { status: 500 }
      )
    }
    console.log('[account/delete] ✓ Deleted auth user')

    // Step 10: Send confirmation email
    try {
      await sendEmail({
        to: userEmail,
        subject: 'Your Prism Account Has Been Deleted',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Account Deletion Confirmed</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Your Prism account has been permanently deleted. All your data, including invoices, clients, and payment information, has been removed from our servers.
            </p>

            <div style="background: #f9f9f9; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #666;">
                <strong>What was deleted:</strong><br/>
                ✓ All invoices and proposals<br/>
                ✓ All client information<br/>
                ✓ Payment details and settings<br/>
                ✓ Payment history and records<br/>
                ✓ Account profile
              </p>
            </div>

            <p style="color: #999; font-size: 14px; margin-top: 20px;">
              If you didn't request this deletion or have any questions, please contact support@prismops.xyz immediately.
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
              © 2026 Prism. Built for freelancers and small teams.
            </p>
          </div>
        `
      })
      console.log('[account/delete] ✓ Confirmation email sent to:', userEmail)
    } catch (emailErr) {
      console.warn('[account/delete] Failed to send confirmation email:', emailErr)
      // Don't fail the entire deletion if email fails
    }

    console.log('[account/delete] ✅ Account completely deleted:', userId)

    return NextResponse.json({
      success: true,
      message: 'Your account has been permanently deleted. Redirecting to home page...'
    }, { status: 200 })
  } catch (error: any) {
    console.error('[account/delete] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
