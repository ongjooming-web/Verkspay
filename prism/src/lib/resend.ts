/**
 * Resend email service wrapper
 * Used for sending payment reminders and notifications
 */

import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('[Resend] RESEND_API_KEY not set - email reminders will be disabled')
}

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

/**
 * Send email via Resend
 * Returns true if successful, false if failed
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Resend] RESEND_API_KEY not configured - skipping email send')
      return false
    }

    console.log('[Resend] Sending email:', {
      from: options.from || 'payments@prismops.xyz',
      to: options.to,
      subject: options.subject,
      htmlLength: options.html.length
    })

    const result = await resend.emails.send({
      from: options.from || 'support@prismops.xyz',
      to: options.to,
      subject: options.subject,
      html: options.html
    })

    if (result.error) {
      console.error('[Resend] Failed to send email. Error:', {
        message: result.error?.message,
        name: result.error?.name
      })
      return false
    }

    console.log('[Resend] Email sent successfully:', result.data?.id)
    return true
  } catch (err: any) {
    console.error('[Resend] Exception during email send:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    })
    return false
  }
}

/**
 * Send payment reminder email
 */
export async function sendPaymentReminder(
  clientEmail: string,
  subject: string,
  html: string
): Promise<boolean> {
  return sendEmail({
    to: clientEmail,
    subject,
    html
  })
}
