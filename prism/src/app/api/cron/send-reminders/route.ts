import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { sendPaymentReminder } from '@/lib/resend'
import { getReminderTemplate, ReminderEmailData } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

/**
 * Cron job: Send payment reminders for overdue invoices
 * Runs daily at 9 AM UTC (configured in vercel.json)
 * Endpoint must be protected with CRON_SECRET
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron authorization
    const cronSecret = req.headers.get('authorization')
    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`

    if (!cronSecret || cronSecret !== expectedSecret) {
      console.error('[cron/send-reminders] Unauthorized cron request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[cron/send-reminders] ========== STARTING CRON JOB ==========')
    const startTime = Date.now()

    const supabase = getSupabaseServer()
    let totalReminders = 0
    const results: any[] = []

    // Define reminder schedule
    const reminders = [
      {
        daysOverdue: 1,
        reminderIndex: 0,
        description: 'Day 1 - First reminder'
      },
      {
        daysOverdue: 3,
        reminderIndex: 1,
        description: 'Day 3 - Second reminder'
      },
      {
        daysOverdue: 7,
        reminderIndex: 2,
        description: 'Day 7 - Final reminder'
      }
    ]

    // Process each reminder wave
    for (const reminder of reminders) {
      console.log(`[cron/send-reminders] Processing ${reminder.description}...`)

      // Calculate target due date (X days ago)
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() - reminder.daysOverdue)
      targetDate.setHours(0, 0, 0, 0)

      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)

      console.log(`[cron/send-reminders] Looking for invoices due between ${targetDate.toISOString()} and ${nextDay.toISOString()}`)

      // Fetch overdue unpaid invoices at this stage
      const { data: invoices, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          amount,
          due_date,
          user_id,
          client_id,
          reminder_sent_count,
          clients:client_id (email),
          profiles:user_id (full_name)
        `)
        .eq('status', 'unpaid')
        .eq('reminder_sent_count', reminder.reminderIndex)
        .gte('due_date', targetDate.toISOString())
        .lt('due_date', nextDay.toISOString())

      if (invoiceError) {
        console.error(`[cron/send-reminders] Error fetching invoices: ${invoiceError.message}`)
        results.push({
          stage: reminder.description,
          status: 'error',
          error: invoiceError.message
        })
        continue
      }

      console.log(`[cron/send-reminders] Found ${invoices?.length || 0} invoices for ${reminder.description}`)

      if (!invoices || invoices.length === 0) {
        results.push({
          stage: reminder.description,
          count: 0,
          status: 'success'
        })
        continue
      }

      // Send reminders for each invoice
      let sentCount = 0
      let failedCount = 0

      for (const invoice of invoices) {
        try {
          const clientEmail = (invoice.clients as any)?.email
          const freelancerName = (invoice.profiles as any)?.full_name || 'the freelancer'

          if (!clientEmail) {
            console.warn(`[cron/send-reminders] No email for client of invoice ${invoice.id}`)
            failedCount++
            continue
          }

          // Prepare email
          const emailData: ReminderEmailData = {
            clientEmail,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.amount,
            dueDate: invoice.due_date,
            freelancerName,
            invoiceId: invoice.id
          }

          const template = getReminderTemplate(reminder.reminderIndex, emailData)

          // Send email
          const emailSent = await sendPaymentReminder(
            clientEmail,
            template.subject,
            template.html
          )

          if (!emailSent) {
            console.error(`[cron/send-reminders] Failed to send email for invoice ${invoice.id}`)
            failedCount++
            continue
          }

          // Update invoice
          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              reminder_sent_count: (invoice.reminder_sent_count || 0) + 1,
              last_reminder_sent_at: new Date().toISOString()
            })
            .eq('id', invoice.id)

          if (updateError) {
            console.error(`[cron/send-reminders] Failed to update invoice ${invoice.id}:`, updateError)
            failedCount++
            continue
          }

          sentCount++
          totalReminders++
          console.log(`[cron/send-reminders] ✓ Reminder sent for invoice ${invoice.invoice_number}`)
        } catch (err: any) {
          console.error(`[cron/send-reminders] Error processing invoice:`, err)
          failedCount++
        }
      }

      results.push({
        stage: reminder.description,
        count: invoices.length,
        sent: sentCount,
        failed: failedCount,
        status: 'success'
      })
    }

    const duration = Date.now() - startTime
    console.log(`[cron/send-reminders] ========== CRON JOB COMPLETE ==========`)
    console.log(`[cron/send-reminders] Total reminders sent: ${totalReminders}`)
    console.log(`[cron/send-reminders] Duration: ${duration}ms`)

    return NextResponse.json({
      success: true,
      totalReminders,
      duration,
      results
    }, { status: 200 })
  } catch (error: any) {
    console.error('[cron/send-reminders] Fatal error:', error)
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    )
  }
}
