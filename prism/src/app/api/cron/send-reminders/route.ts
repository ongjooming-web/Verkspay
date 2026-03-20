import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { formatCurrency } from '@/lib/countries'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[Cron] Unauthorized: Missing or invalid authorization header')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    if (token !== process.env.CRON_SECRET) {
      console.log('[Cron] Unauthorized: Invalid CRON_SECRET')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Cron] Starting smart reminders processing...')

    // Find all unpaid/partial invoices that are overdue
    // Join with clients and profiles to get payment details
    let overdueInvoices: any[] = []
    let invoicesError: any = null

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          amount,
          due_date,
          status,
          remaining_balance,
          user_id,
          client_id,
          clients (
            id,
            name,
            email
          ),
          profiles (
            bank_name,
            bank_account_number,
            bank_account_name,
            duitnow_id,
            payment_instructions
          )
        `)
        .in('status', ['unpaid', 'paid_partial'])
        .lte('due_date', new Date().toISOString())

      overdueInvoices = data || []
      invoicesError = error
    } catch (err) {
      invoicesError = err
      console.error('[Cron] Exception during invoice query:', err)
    }

    if (invoicesError) {
      console.error('[Cron] Database query failed:', invoicesError?.message || String(invoicesError))
      return NextResponse.json(
        { 
          error: 'Database query failed',
          details: invoicesError?.message || String(invoicesError),
        },
        { status: 500 }
      )
    }

    console.log(`[Cron] Found ${overdueInvoices?.length || 0} overdue invoices`)

    let remindersCount = 0
    const results = []

    // Process each invoice
    for (const invoice of overdueInvoices || []) {
      try {
        const dueDate = new Date(invoice.due_date)
        const today = new Date()
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

        console.log(`[Cron] Processing invoice ${invoice.invoice_number}: ${daysOverdue} days overdue`)

        // Only send reminders at 3, 7, and 14 day thresholds
        let reminderType: string | null = null
        if (daysOverdue >= 3 && daysOverdue < 7) {
          reminderType = '3_day_overdue'
        } else if (daysOverdue >= 7 && daysOverdue < 14) {
          reminderType = '7_day_overdue'
        } else if (daysOverdue >= 14) {
          reminderType = '14_day_overdue'
        }

        if (!reminderType) {
          console.log(`[Cron] Invoice ${invoice.invoice_number}: Skipping - no threshold match (${daysOverdue} days)`)
          continue
        }

        // Check if reminder already sent for this threshold
        let existingReminder: any = null
        let checkError: any = null

        try {
          const { data, error } = await supabase
            .from('reminders_log')
            .select('id')
            .eq('invoice_id', invoice.id)
            .eq('reminder_type', reminderType)
            .single()

          existingReminder = data
          checkError = error
        } catch (err) {
          checkError = err
          console.error(`[Cron] Exception checking reminder for invoice ${invoice.invoice_number}:`, err)
        }

        // PGRST116 = no rows found (expected)
        if (checkError && checkError.code !== 'PGRST116') {
          console.error(`[Cron] Error checking existing reminder for ${invoice.invoice_number}:`, checkError)
          continue
        }

        if (existingReminder) {
          console.log(`[Cron] Invoice ${invoice.invoice_number}: Already sent ${reminderType} reminder`)
          continue
        }

        // Get client email - handle nested clients object
        const clientEmail = (invoice.clients as any)?.email
        const clientName = (invoice.clients as any)?.name

        if (!clientEmail) {
          console.log(`[Cron] Skipping ${invoice.invoice_number} - no client email found`)
          continue
        }

        // Get payment details from user's profile
        const profile = (invoice.profiles as any)
        if (!profile?.bank_account_number) {
          console.log(`[Cron] Skipping ${invoice.invoice_number} - user has no payment details configured`)
          continue
        }

        // Generate email content based on reminder type
        const { subject, html } = generateReminderEmail(
          invoice,
          { name: clientName, email: clientEmail },
          profile,
          reminderType,
          daysOverdue
        )

        // Send email via Resend
        let emailResult: any
        try {
          emailResult = await resend.emails.send({
            from: 'Prism Invoicing <support@prismops.xyz>',
            to: clientEmail,
            subject,
            html,
          })
        } catch (emailErr) {
          console.error(`[Cron] Exception sending email for ${invoice.invoice_number}:`, emailErr)
          continue
        }

        if (emailResult.error) {
          console.error(`[Cron] Failed to send email for ${invoice.invoice_number}:`, emailResult.error)
          continue
        }

        console.log(`[Cron] Email sent to ${clientEmail} for invoice ${invoice.invoice_number} (${reminderType})`)

        // Log reminder in database
        let logError: any = null
        try {
          const { error } = await supabase
            .from('reminders_log')
            .insert({
              invoice_id: invoice.id,
              reminder_type: reminderType,
              days_overdue: daysOverdue,
              email_sent_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            })

          logError = error
        } catch (err) {
          logError = err
          console.error(`[Cron] Exception logging reminder for ${invoice.invoice_number}:`, err)
        }

        if (logError) {
          console.error(`[Cron] Failed to log reminder for ${invoice.invoice_number}:`, logError)
        } else {
          remindersCount++
          results.push({
            invoiceNumber: invoice.invoice_number,
            clientEmail,
            reminderType,
            daysOverdue,
          })
          console.log(`[Cron] Reminder logged in database for ${invoice.invoice_number}`)
        }
      } catch (invoiceProcessErr) {
        console.error('[Cron] Unexpected error processing invoice:', invoiceProcessErr)
        continue
      }
    }

    console.log(`[Cron] Completed: ${remindersCount} reminders sent`)

    return NextResponse.json({
      success: true,
      reminders_sent: remindersCount,
      invoices_processed: overdueInvoices?.length || 0,
      results,
      message: 'Smart reminders processing completed',
    })
  } catch (error) {
    console.error('[Cron] Fatal error:', (error as any)?.message || String(error))
    
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        details: (error as any)?.message || String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * Generate email HTML based on reminder type
 * Uses dynamic payment details from user's profile
 */
function generateReminderEmail(
  invoice: any,
  client: { name: string; email: string },
  profile: any,
  reminderType: string,
  daysOverdue: number
) {
  const invoiceLink = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.id}`
  const amountDue = (invoice.remaining_balance || (invoice.amount - (invoice.amount_paid || 0))).toFixed(2)

  let subject = ''
  let heading = ''
  let bodyText = ''
  let tone = ''

  if (reminderType === '3_day_overdue') {
    subject = `Friendly reminder — Invoice ${invoice.invoice_number} is overdue`
    heading = `Invoice ${invoice.invoice_number} is overdue`
    bodyText = `Your invoice is now ${daysOverdue} days overdue.`
    tone = 'friendly'
  } else if (reminderType === '7_day_overdue') {
    subject = `Invoice ${invoice.invoice_number} — Payment still outstanding`
    heading = `Payment still needed for Invoice ${invoice.invoice_number}`
    bodyText = `Your invoice is now ${daysOverdue} days overdue.`
    tone = 'firm'
  } else if (reminderType === '14_day_overdue') {
    subject = `Action required — Invoice ${invoice.invoice_number} overdue by ${daysOverdue} days`
    heading = `Urgent: Invoice ${invoice.invoice_number} requires immediate payment`
    bodyText = `Your invoice is now ${daysOverdue} days overdue. Please arrange payment immediately.`
    tone = 'urgent'
  }

  // Dynamic payment details from user's profile
  const bankSection = profile?.bank_account_number ? `
    <strong>Bank Transfer:</strong><br>
    ${profile.bank_name || 'Bank'}: ${profile.bank_account_number}<br>
    Account Name: ${profile.bank_account_name || 'N/A'}<br><br>
  ` : ''

  const duitnowSection = profile?.duitnow_id ? `
    <strong>DuitNow (Real-time):</strong><br>
    ID: ${profile.duitnow_id}<br><br>
  ` : ''

  const instructionsSection = profile?.payment_instructions ? `
    <p><strong>Additional Instructions:</strong></p>
    <p>${profile.payment_instructions}</p>
  ` : ''

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; color: #000; }
        .details { background: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
        .details-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .details-label { color: #666; }
        .details-value { font-weight: bold; }
        .cta { margin: 30px 0; text-align: center; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .button:hover { background: #0056b3; }
        .banking { background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .banking-title { font-weight: bold; margin-bottom: 10px; }
        .banking-details { font-size: 14px; line-height: 1.8; }
        .footer { color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${heading}</h1>
        </div>

        <p>Hi ${client.name},</p>

        <p>${bodyText}</p>

        <div class="details">
          <div class="details-row">
            <span class="details-label">Invoice Number:</span>
            <span class="details-value">${invoice.invoice_number}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Original Due Date:</span>
            <span class="details-value">${new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Amount Due:</span>
            <span class="details-value">${formatCurrency(parseFloat(amountDue), invoice.currency_code || 'MYR')}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Days Overdue:</span>
            <span class="details-value">${daysOverdue}</span>
          </div>
        </div>

        ${tone === 'friendly' ? `
          <p>We'd appreciate your prompt payment. If you've already sent this, please disregard this email.</p>
        ` : tone === 'firm' ? `
          <p>Please arrange payment at your earliest convenience. If payment has already been made, please accept our thanks.</p>
        ` : `
          <p><strong>If there are any issues with this invoice or if you have questions about payment, please contact us immediately.</strong></p>
        `}

        <div class="cta">
          <a href="${invoiceLink}" class="button">View & Pay Invoice</a>
        </div>

        <div class="banking">
          <div class="banking-title">💳 Payment Methods</div>
          <div class="banking-details">
            ${bankSection}
            ${duitnowSection}
            Reference: Use invoice number ${invoice.invoice_number}
          </div>
        </div>

        ${instructionsSection}

        <p>Thank you for your business.</p>

        <div class="footer">
          <p>This is an automated payment reminder from Prism Invoicing. If you believe this was sent in error, please contact us.</p>
          <p>© 2026 Prism. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return { subject, html }
}
