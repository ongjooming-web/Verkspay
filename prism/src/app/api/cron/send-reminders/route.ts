import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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
    let invoices: any[] = []
    let invoicesError: any = null

    try {
      const result = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          amount,
          amount_paid,
          due_date,
          status,
          client_id,
          clients(id, email, name)
        `)
        .in('status', ['unpaid', 'paid_partial'])
        .lt('due_date', new Date().toISOString())

      invoices = result.data || []
      invoicesError = result.error
    } catch (err) {
      invoicesError = err
      console.error('[Cron] Exception during invoice query:', err)
    }

    if (invoicesError) {
      console.error('[Cron] Full error object:', JSON.stringify(invoicesError, null, 2))
      console.error('[Cron] Error message:', invoicesError?.message)
      console.error('[Cron] Error code:', invoicesError?.code)
      console.error('[Cron] Error details:', invoicesError?.details)
      
      return NextResponse.json(
        { 
          error: 'Database query failed',
          details: invoicesError?.message || String(invoicesError),
          code: invoicesError?.code
        },
        { status: 500 }
      )
    }

    console.log(`[Cron] Found ${invoices?.length || 0} overdue invoices`)

    let remindersCount = 0
    const results = []

    // Process each invoice
    for (const invoice of invoices || []) {
      try {
        const dueDate = new Date(invoice.due_date)
        const today = new Date()
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

        console.log(`[Cron] Invoice ${invoice.invoice_number}: ${daysOverdue} days overdue`)

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
          console.log(`[Cron] Invoice ${invoice.invoice_number}: No reminder threshold matched`)
          continue
        }

        // Check if reminder already sent for this threshold
        let existingReminder: any = null
        let checkError: any = null

        try {
          const result = await supabase
            .from('reminders_log')
            .select('id')
            .eq('invoice_id', invoice.id)
            .eq('reminder_type', reminderType)
            .single()

          existingReminder = result.data
          checkError = result.error
        } catch (err) {
          checkError = err
          console.error(`[Cron] Exception checking reminder for invoice ${invoice.invoice_number}:`, err)
        }

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error(`[Cron] Error checking existing reminder for ${invoice.invoice_number}:`, checkError)
          continue
        }

        if (existingReminder) {
          console.log(`[Cron] Invoice ${invoice.invoice_number}: Reminder already sent for ${reminderType}`)
          continue
        }

        // Get client email
        const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients
        if (!client?.email) {
          console.error(`[Cron] Invoice ${invoice.invoice_number}: No client email found`)
          continue
        }

        // Generate email content based on reminder type
        const { subject, html } = generateReminderEmail(
          invoice,
          client,
          reminderType,
          daysOverdue
        )

        // Send email via Resend
        let emailResult: any
        try {
          emailResult = await resend.emails.send({
            from: 'Prism Invoicing <support@prismops.xyz>',
            to: client.email,
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

        console.log(`[Cron] Email sent to ${client.email} for invoice ${invoice.invoice_number}`)

        // Log reminder in database
        let logError: any = null
        try {
          const result = await supabase
            .from('reminders_log')
            .insert({
              invoice_id: invoice.id,
              reminder_type: reminderType,
              days_overdue: daysOverdue,
              email_sent: true,
              email_sent_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            })

          logError = result.error
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
            clientEmail: client.email,
            reminderType,
            daysOverdue,
          })
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
      invoices_processed: invoices?.length || 0,
      results,
      message: 'Smart reminders processing completed',
    })
  } catch (error) {
    console.error('[Cron] Outer catch - Error:', error)
    console.error('[Cron] Error message:', (error as any)?.message)
    console.error('[Cron] Full error:', JSON.stringify(error, null, 2))
    
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
 */
function generateReminderEmail(
  invoice: any,
  client: any,
  reminderType: string,
  daysOverdue: number
) {
  const invoiceLink = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.id}`
  const amountDue = (invoice.amount - (invoice.amount_paid || 0)).toFixed(2)

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
            <span class="details-value">RM ${amountDue}</span>
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
            <strong>Bank Transfer:</strong><br>
            Maybank: 5641 9158 7752<br>
            Account Name: Tria Ventures<br>
            <br>
            <strong>DuitNow (Real-time):</strong><br>
            Phone/ID: [Your DuitNow ID]<br>
            <br>
            Reference: Use invoice number ${invoice.invoice_number}
          </div>
        </div>

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
