import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

    // Verify auth using the user's own token (NOT service role key)
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

    // Create a client with the USER'S OWN TOKEN (not service role key!)
    // This is secure because the token is already validated and scoped to that user
    const token = authHeader?.substring(7) || ''
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

    console.log('[account/delete] Calling delete_user_account function...')

    // Call the database function that handles deletion securely
    const { data, error: functionError } = await supabase
      .rpc('delete_user_account', { p_user_id: userId })

    if (functionError) {
      console.error('[account/delete] Function error:', functionError)
      return NextResponse.json(
        { error: `Deletion failed: ${functionError.message}` },
        { status: 500 }
      )
    }

    if (!data || !data[0]?.success) {
      console.error('[account/delete] Function returned failure:', data)
      return NextResponse.json(
        { error: data?.[0]?.message || 'Account deletion failed' },
        { status: 500 }
      )
    }

    const result = data[0]
    console.log('[account/delete] Account deletion successful:', {
      deleted_invoices: result.deleted_invoices,
      deleted_clients: result.deleted_clients,
      deleted_proposals: result.deleted_proposals,
      deleted_payments: result.deleted_payments,
      deleted_methods: result.deleted_methods,
      deleted_recurring: result.deleted_recurring,
      deleted_reminders: result.deleted_reminders,
      deleted_profile: result.deleted_profile
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
                ✓ ${result.deleted_invoices} invoices and reminders<br/>
                ✓ ${result.deleted_clients} clients<br/>
                ✓ ${result.deleted_proposals} proposals<br/>
                ✓ ${result.deleted_payments} payment records<br/>
                ✓ ${result.deleted_methods} payment methods<br/>
                ✓ Account profile and all data
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
      message: 'Your account has been permanently deleted. Redirecting to home page...',
      details: {
        deleted_invoices: result.deleted_invoices,
        deleted_clients: result.deleted_clients,
        deleted_proposals: result.deleted_proposals
      }
    }, { status: 200 })
  } catch (error: any) {
    console.error('[account/delete] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
