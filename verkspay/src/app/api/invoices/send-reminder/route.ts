import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-server'
import { sendPaymentReminder } from '@/lib/resend'
import { getReminderTemplate, ReminderEmailData } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json()

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'invoiceId is required' },
        { status: 400 }
      )
    }

    console.log('[invoices/send-reminder] Sending reminder for invoice:', invoiceId)

    // Verify auth
    const { user, error: authError } = await requireAuth(req)
    if (authError) {
      console.error('[invoices/send-reminder] Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      )
    }

    const userId = user.id
    const supabase = getSupabaseServer()

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single()

    if (invoiceError || !invoice) {
      console.error('[invoices/send-reminder] Invoice not found:', invoiceError)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Check if invoice is paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot send reminder for paid invoice' },
        { status: 400 }
      )
    }

    // Check if invoice is overdue
    const dueDate = new Date(invoice.due_date)
    const now = new Date()
    if (dueDate > now) {
      return NextResponse.json(
        { error: 'Invoice is not yet due' },
        { status: 400 }
      )
    }

    // Check reminder limit (max 3 reminders)
    const reminderCount = invoice.reminder_sent_count || 0
    if (reminderCount >= 3) {
      return NextResponse.json(
        { error: 'Maximum reminders (3) already sent' },
        { status: 400 }
      )
    }

    // Fetch freelancer profile for name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[invoices/send-reminder] Profile not found:', profileError)
      return NextResponse.json(
        { error: 'Freelancer profile not found' },
        { status: 404 }
      )
    }

    // Fetch client for email
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('email')
      .eq('id', invoice.client_id)
      .single()

    if (clientError || !client?.email) {
      console.error('[invoices/send-reminder] Client email not found:', clientError)
      return NextResponse.json(
        { error: 'Client email not found' },
        { status: 404 }
      )
    }

    // Prepare email data
    const emailData: ReminderEmailData = {
      clientEmail: client.email,
      invoiceNumber: invoice.invoice_number,
      amount: invoice.amount,
      dueDate: invoice.due_date,
      freelancerName: profile.full_name || 'the freelancer',
      invoiceId: invoiceId
    }

    // Get appropriate template based on reminder count
    const template = getReminderTemplate(reminderCount, emailData)

    // Send email via Resend
    console.log('[invoices/send-reminder] Sending email to:', client.email)
    const emailSent = await sendPaymentReminder(
      client.email,
      template.subject,
      template.html
    )

    if (!emailSent) {
      console.error('[invoices/send-reminder] Failed to send email')
      return NextResponse.json(
        { error: 'Failed to send reminder email' },
        { status: 500 }
      )
    }

    // Update reminder count and timestamp
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        reminder_sent_count: reminderCount + 1,
        last_reminder_sent_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    if (updateError) {
      console.error('[invoices/send-reminder] Failed to update invoice:', updateError)
      return NextResponse.json(
        { error: 'Reminder sent but failed to update tracking' },
        { status: 500 }
      )
    }

    console.log('[invoices/send-reminder] ✓ Reminder sent successfully')

    return NextResponse.json({
      success: true,
      message: `Reminder ${reminderCount + 1} of 3 sent`,
      reminderCount: reminderCount + 1,
      sentAt: new Date().toISOString()
    }, { status: 200 })
  } catch (error: any) {
    console.error('[invoices/send-reminder] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
