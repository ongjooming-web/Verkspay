import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { generateReminderWhatsAppLink } from '@/utils/whatsapp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

// --- Email generator (unchanged) ---
function generateReminderEmail(
  invoice: any,
  client: { name: string; email: string },
  profile: any,
  reminderType: string,
  daysOverdue: number
): { subject: string; html: string } {
  const urgencyMap: Record<string, { subject: string; heading: string; color: string }> = {
    '3_day_overdue': {
      subject: `Friendly Reminder: Invoice #${invoice.invoice_number} is overdue`,
      heading: 'Friendly Payment Reminder',
      color: '#f59e0b',
    },
    '7_day_overdue': {
      subject: `Action Required: Invoice #${invoice.invoice_number} is 7 days overdue`,
      heading: 'Payment Overdue — Action Required',
      color: '#ef4444',
    },
    '14_day_overdue': {
      subject: `Final Notice: Invoice #${invoice.invoice_number} is 14 days overdue`,
      heading: 'Final Payment Notice',
      color: '#dc2626',
    },
  }

  const { subject, heading, color } = urgencyMap[reminderType]

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: ${color};">${heading}</h2>
      <p>Dear ${client.name},</p>
      <p>This is a reminder that Invoice <strong>#${invoice.invoice_number}</strong> is 
      <strong>${daysOverdue} days overdue</strong>.</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Invoice Number</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">#${invoice.invoice_number}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Amount Due</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${invoice.remaining_balance ?? invoice.amount}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Due Date</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date(invoice.due_date).toLocaleDateString()}</td></tr>
      </table>
      ${profile?.bank_account_number ? `
      <p><strong>Payment Details:</strong><br/>
      Bank: ${profile.bank_name ?? ''}<br/>
      Account: ${profile.bank_account_number}<br/>
      Name: ${profile.bank_account_name ?? ''}<br/>
      ${profile.duitnow_id ? `DuitNow ID: ${profile.duitnow_id}` : ''}
      </p>` : ''}
      ${profile?.payment_instructions ? `<p>${profile.payment_instructions}</p>` : ''}
      <p>Please arrange payment at your earliest convenience.</p>
      <p>Thank you.</p>
    </div>
  `

  return { subject, html }
}

// --- Cron handler ---
export async function POST(request: NextRequest) {
  try {
    // 1. Validate CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[Cron] Unauthorized: Missing authorization header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (token !== process.env.CRON_SECRET) {
      console.log('[Cron] Unauthorized: Invalid CRON_SECRET token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Calculate 3-day cooldown threshold
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const today = new Date().toISOString()

    // 3. Query invoices eligible for reminders
    const { data: overdueInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        amount,
        due_date,
        status,
        remaining_balance,
        reminder_sent_count,
        last_reminder_sent_at,
        user_id,
        client_id,
        payment_link,
        clients (id, name, email, phone),
        profiles (id, business_name, bank_name, bank_account_number, bank_account_name, duitnow_id, payment_instructions)
      `)
      .in('status', ['unpaid', 'paid_partial'])
      .lte('due_date', today)
      .lt('reminder_sent_count', 3)
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${threeDaysAgo.toISOString()}`)

    if (invoicesError) {
      console.error('[Cron] DB query failed:', invoicesError.message)
      return NextResponse.json({ error: 'Database query failed', details: invoicesError.message }, { status: 500 })
    }

    console.log(`[Cron] Found ${overdueInvoices?.length ?? 0} invoices eligible for reminders`)

    let remindersCount = 0
    const results = []

    for (const invoice of overdueInvoices ?? []) {
      try {
        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
        )

        // 4. Determine reminder type by days overdue threshold
        let reminderType: string | null = null
        if (daysOverdue >= 3 && daysOverdue < 7) reminderType = '3_day_overdue'
        else if (daysOverdue >= 7 && daysOverdue < 14) reminderType = '7_day_overdue'
        else if (daysOverdue >= 14) reminderType = '14_day_overdue'

        if (!reminderType) {
          console.log(`[Cron] ${invoice.invoice_number}: No threshold match (${daysOverdue} days), skipping`)
          continue
        }

        const client = invoice.clients as any
        const profile = invoice.profiles as any

        if (!client?.email) {
          console.log(`[Cron] ${invoice.invoice_number}: No client email, skipping`)
          continue
        }

        if (!profile?.bank_account_number) {
          console.log(`[Cron] ${invoice.invoice_number}: No payment details, skipping`)
          continue
        }

        // 5. Generate WhatsApp link
        let whatsappLink = ''
        if (client?.phone) {
          whatsappLink = generateReminderWhatsAppLink(
            client.name,
            invoice.invoice_number,
            invoice.remaining_balance ?? invoice.amount,
            'MYR', // TODO: Get from invoice currency_code if available
            invoice.due_date,
            daysOverdue,
            invoice.payment_link || `https://app.verkspay.com/pay/${invoice.id}`,
            profile?.business_name || 'Verkspay',
            client.phone
          )
          console.log(`[Cron] Generated WhatsApp link for ${invoice.invoice_number}`)
        }

        // 6. Generate and send email
        const { subject, html } = generateReminderEmail(
          invoice,
          { name: client.name, email: client.email },
          profile,
          reminderType,
          daysOverdue
        )

        const emailResult = await resend.emails.send({
          from: 'Verkspay Invoicing <support@verkspay.com>',
          to: client.email,
          subject,
          html,
        })

        if (emailResult.error) {
          console.error(`[Cron] Email failed for ${invoice.invoice_number}:`, emailResult.error)
          continue
        }

        // 7. Log reminder in reminders_log table with WhatsApp link
        const { error: logError } = await supabase
          .from('reminders_log')
          .upsert(
            {
              invoice_id: invoice.id,
              reminder_type: reminderType,
              days_overdue: daysOverdue,
              email_sent: true,
              email_sent_at: new Date().toISOString(),
              whatsapp_link: whatsappLink || null,
            },
            { onConflict: 'invoice_id,reminder_type' }
          )

        if (logError) {
          console.error(`[Cron] Failed to log reminder for ${invoice.invoice_number}:`, logError)
          // Don't fail the entire process, just log the error
        }

        // 8. Update invoice reminder tracking columns
        const newCount = (invoice.reminder_sent_count ?? 0) + 1
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            reminder_sent_count: newCount,
            last_reminder_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoice.id)

        if (updateError) {
          console.error(`[Cron] Failed to update invoice ${invoice.invoice_number}:`, updateError)
          continue
        }

        console.log(`[Cron] Reminder ${newCount}/3 sent for ${invoice.invoice_number} → ${client.email}`)
        if (whatsappLink) {
          console.log(`[Cron] WhatsApp link available: ${whatsappLink.substring(0, 50)}...`)
        }
        remindersCount++
        results.push({
          invoiceNumber: invoice.invoice_number,
          clientEmail: client.email,
          clientPhone: client?.phone || null,
          reminderType,
          daysOverdue,
          reminderCount: newCount,
          whatsappLink: whatsappLink || null,
        })
      } catch (err) {
        console.error('[Cron] Error processing invoice:', err)
        continue
      }
    }

    console.log(`[Cron] Done: ${remindersCount} reminders sent`)
    return NextResponse.json({
      success: true,
      reminders_sent: remindersCount,
      invoices_processed: overdueInvoices?.length ?? 0,
      results,
    })
  } catch (error) {
    console.error('[Cron] Fatal error:', (error as any)?.message)
    return NextResponse.json({ error: 'Cron job failed', details: (error as any)?.message }, { status: 500 })
  }
}
