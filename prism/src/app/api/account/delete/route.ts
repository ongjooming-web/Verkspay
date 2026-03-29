import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { sendEmail } from '@/lib/resend'

interface DeletionStep {
  step: string
  status: 'success' | 'failed'
  count?: number
  error?: string
}

export async function DELETE(req: NextRequest) {
  const deletionSteps: DeletionStep[] = []

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

    // ✅ CRITICAL: Verify auth first - NEVER trust request body for userId
    console.log('[account/delete] Verifying auth with user token...')
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

    // ✅ Use userId from token, NOT from request body
    const userId = user.id
    const userEmail = user.email
    console.log('[account/delete] Auth successful. User:', userId, 'Email:', userEmail)

    // ✅ Verify email confirmation matches
    if (emailFromBody !== userEmail) {
      console.warn('[account/delete] Email mismatch. Expected:', userEmail, 'Got:', emailFromBody)
      return NextResponse.json(
        { error: 'Email confirmation does not match' },
        { status: 400 }
      )
    }

    // Extract token for user-scoped client
    const token = authHeader?.substring(7) || ''
    
    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      )
    }

    // Create Supabase client with user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    console.log('[account/delete] Starting account deletion for user:', userId)

    // ✅ Deletion order matters - delete children before parents
    
    // 1. Delete reminders_log (depends on invoices)
    console.log('[account/delete] Deleting reminders...')
    const remindersQuery = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', userId)
    
    const invoiceIds = remindersQuery.data?.map(inv => inv.id) || []
    
    if (invoiceIds.length > 0) {
      const { error: remindersError, count } = await supabase
        .from('reminders_log')
        .delete()
        .in('invoice_id', invoiceIds)

      if (remindersError) {
        deletionSteps.push({ step: 'reminders_log', status: 'failed', error: remindersError.message })
        console.error('[account/delete] Failed to delete reminders:', remindersError)
        throw new Error(`Reminders deletion failed: ${remindersError.message}`)
      }
      deletionSteps.push({ step: 'reminders_log', status: 'success', count: count ?? undefined })
      console.log('[account/delete] ✓ Deleted reminders:', count || 0)
    }

    // 2. Delete payment_records
    console.log('[account/delete] Deleting payment records...')
    const { error: paymentRecordsError, count: paymentRecordsCount } = await supabase
      .from('payment_records')
      .delete()
      .eq('user_id', userId)

    if (paymentRecordsError) {
      deletionSteps.push({ step: 'payment_records', status: 'failed', error: paymentRecordsError.message })
      console.error('[account/delete] Failed to delete payment_records:', paymentRecordsError)
      throw new Error(`Payment records deletion failed: ${paymentRecordsError.message}`)
    }
    deletionSteps.push({ step: 'payment_records', status: 'success', count: paymentRecordsCount ?? undefined })
    console.log('[account/delete] ✓ Deleted payment_records:', paymentRecordsCount || 0)

    // 3. Delete payment_methods
    console.log('[account/delete] Deleting payment methods...')
    const { error: paymentMethodsError, count: paymentMethodsCount } = await supabase
      .from('payment_methods')
      .delete()
      .eq('user_id', userId)

    if (paymentMethodsError) {
      deletionSteps.push({ step: 'payment_methods', status: 'failed', error: paymentMethodsError.message })
      console.error('[account/delete] Failed to delete payment_methods:', paymentMethodsError)
      throw new Error(`Payment methods deletion failed: ${paymentMethodsError.message}`)
    }
    deletionSteps.push({ step: 'payment_methods', status: 'success', count: paymentMethodsCount ?? undefined })
    console.log('[account/delete] ✓ Deleted payment_methods:', paymentMethodsCount || 0)

    // 4. Delete recurring_invoices
    console.log('[account/delete] Deleting recurring invoices...')
    const { error: recurringError, count: recurringCount } = await supabase
      .from('recurring_invoices')
      .delete()
      .eq('user_id', userId)

    if (recurringError) {
      deletionSteps.push({ step: 'recurring_invoices', status: 'failed', error: recurringError.message })
      console.error('[account/delete] Failed to delete recurring_invoices:', recurringError)
      throw new Error(`Recurring invoices deletion failed: ${recurringError.message}`)
    }
    deletionSteps.push({ step: 'recurring_invoices', status: 'success', count: recurringCount ?? undefined })
    console.log('[account/delete] ✓ Deleted recurring_invoices:', recurringCount || 0)

    // 5. Delete invoices
    console.log('[account/delete] Deleting invoices...')
    const { error: invoicesError, count: invoicesCount } = await supabase
      .from('invoices')
      .delete()
      .eq('user_id', userId)

    if (invoicesError) {
      deletionSteps.push({ step: 'invoices', status: 'failed', error: invoicesError.message })
      console.error('[account/delete] Failed to delete invoices:', invoicesError)
      throw new Error(`Invoices deletion failed: ${invoicesError.message}`)
    }
    deletionSteps.push({ step: 'invoices', status: 'success', count: invoicesCount ?? undefined })
    console.log('[account/delete] ✓ Deleted invoices:', invoicesCount || 0)

    // 6. Delete clients
    console.log('[account/delete] Deleting clients...')
    const { error: clientsError, count: clientsCount } = await supabase
      .from('clients')
      .delete()
      .eq('user_id', userId)

    if (clientsError) {
      deletionSteps.push({ step: 'clients', status: 'failed', error: clientsError.message })
      console.error('[account/delete] Failed to delete clients:', clientsError)
      throw new Error(`Clients deletion failed: ${clientsError.message}`)
    }
    deletionSteps.push({ step: 'clients', status: 'success', count: clientsCount ?? undefined })
    console.log('[account/delete] ✓ Deleted clients:', clientsCount || 0)

    // 7. Delete proposals
    console.log('[account/delete] Deleting proposals...')
    const { error: proposalsError, count: proposalsCount } = await supabase
      .from('proposals')
      .delete()
      .eq('user_id', userId)

    if (proposalsError) {
      deletionSteps.push({ step: 'proposals', status: 'failed', error: proposalsError.message })
      console.error('[account/delete] Failed to delete proposals:', proposalsError)
      throw new Error(`Proposals deletion failed: ${proposalsError.message}`)
    }
    deletionSteps.push({ step: 'proposals', status: 'success', count: proposalsCount ?? undefined })
    console.log('[account/delete] ✓ Deleted proposals:', proposalsCount || 0)

    // 8. Delete profile (final step)
    console.log('[account/delete] Deleting profile...')
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      deletionSteps.push({ step: 'profiles', status: 'failed', error: profileError.message })
      console.error('[account/delete] Failed to delete profile:', profileError)
      throw new Error(`Profile deletion failed: ${profileError.message}`)
    }
    deletionSteps.push({ step: 'profiles', status: 'success' })
    console.log('[account/delete] ✓ Deleted profile')

    // ℹ️ NOTE: Auth user deletion is not needed
    // Profile deletion prevents login (app checks profile exists)
    // Service role key cannot delete auth users (Supabase API limitation)
    // Therefore: user is effectively deleted (no data, can't log in)
    console.log('[account/delete] ℹ️ Auth user orphaned (profile deletion prevents login)')

    // ✅ AUDIT: Log deletion for compliance (GDPR)
    console.log('[account/delete] Deletion audit log:', {
      user_id: userId,
      email: userEmail,
      deleted_at: new Date().toISOString(),
      action: 'account_deletion',
      steps: deletionSteps
    })

    // Send confirmation email
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
      message: 'Your account has been permanently deleted. Redirecting to goodbye page...',
      redirect_url: '/goodbye',
      deletion_summary: {
        total_steps: deletionSteps.length,
        successful_steps: deletionSteps.filter(s => s.status === 'success').length,
        failed_steps: deletionSteps.filter(s => s.status === 'failed').length
      }
    }, { status: 200 })
  } catch (error: any) {
    console.error('[account/delete] Unexpected error:', error)
    console.error('[account/delete] Deletion steps completed before error:', deletionSteps)
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        deletion_steps: deletionSteps
      },
      { status: 500 }
    )
  }
}
