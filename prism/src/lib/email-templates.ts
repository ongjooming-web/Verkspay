/**
 * Email templates for payment reminders
 * Uses Resend for reliable delivery
 */

export interface ReminderEmailData {
  clientEmail: string
  invoiceNumber: string
  amount: number
  dueDate: string
  freelancerName: string
  invoiceId: string
}

/**
 * Day 1 Overdue - Polite reminder
 */
export function getDayOneTemplate(data: ReminderEmailData) {
  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${data.invoiceId}`

  return {
    subject: `Invoice ${data.invoiceNumber} is now due`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Hi there!</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Just a friendly reminder that invoice <strong>${data.invoiceNumber}</strong> is now due.
        </p>

        <div style="background: #f9f9f9; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; color: #666;"><strong>Invoice Details</strong></p>
          <p style="margin: 4px 0; color: #666;">
            <strong>Invoice Number:</strong> ${data.invoiceNumber}
          </p>
          <p style="margin: 4px 0; color: #666;">
            <strong>Amount:</strong> $${data.amount.toFixed(2)}
          </p>
          <p style="margin: 4px 0; color: #666;">
            <strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentLink}" style="background: #3b82f6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Pay Now
          </a>
        </div>

        <p style="color: #999; font-size: 14px; text-align: center; margin-top: 20px;">
          Have any questions? Reply to this email or contact ${data.freelancerName} directly.
        </p>
      </div>
    `
  }
}

/**
 * Day 3 Overdue - Friendly follow-up
 */
export function getDayThreeTemplate(data: ReminderEmailData) {
  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${data.invoiceId}`

  return {
    subject: `Following up: Invoice ${data.invoiceNumber} is 3 days overdue`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Quick Follow-up</h2>
        
        <p style="color: #666; line-height: 1.6;">
          We noticed that invoice <strong>${data.invoiceNumber}</strong> is now 3 days overdue. 
          We'd appreciate if you could settle this at your earliest convenience.
        </p>

        <div style="background: #fff3cd; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; color: #666;"><strong>Invoice Details</strong></p>
          <p style="margin: 4px 0; color: #666;">
            <strong>Invoice Number:</strong> ${data.invoiceNumber}
          </p>
          <p style="margin: 4px 0; color: #666;">
            <strong>Amount:</strong> $${data.amount.toFixed(2)}
          </p>
          <p style="margin: 4px 0; color: #666;">
            <strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}
          </p>
          <p style="margin: 4px 0; color: #f59e0b; font-weight: 600;">
            Status: 3 days overdue
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentLink}" style="background: #f59e0b; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Pay Now
          </a>
        </div>

        <p style="color: #999; font-size: 14px; text-align: center; margin-top: 20px;">
          If you've already paid, please disregard this message. Contact ${data.freelancerName} with any questions.
        </p>
      </div>
    `
  }
}

/**
 * Day 7 Overdue - Firm action required
 */
export function getDaySevenTemplate(data: ReminderEmailData) {
  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${data.invoiceId}`

  return {
    subject: `⚠️ URGENT: Invoice ${data.invoiceNumber} is 7 days overdue - Action required`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">⚠️ Urgent: Payment Action Required</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Invoice <strong>${data.invoiceNumber}</strong> is now <strong>7 days overdue</strong> and requires immediate payment.
          Please settle this outstanding balance without further delay.
        </p>

        <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; color: #666;"><strong>Invoice Details</strong></p>
          <p style="margin: 4px 0; color: #666;">
            <strong>Invoice Number:</strong> ${data.invoiceNumber}
          </p>
          <p style="margin: 4px 0; color: #666;">
            <strong>Amount:</strong> $${data.amount.toFixed(2)}
          </p>
          <p style="margin: 4px 0; color: #666;">
            <strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}
          </p>
          <p style="margin: 4px 0; color: #dc2626; font-weight: 600;">
            ⚠️ Status: 7 days overdue - Urgent
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentLink}" style="background: #dc2626; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Pay Now - Settle Immediately
          </a>
        </div>

        <p style="color: #999; font-size: 14px; text-align: center; margin-top: 20px;">
          If payment has already been sent, please contact ${data.freelancerName} immediately with proof of payment.
        </p>
      </div>
    `
  }
}

/**
 * Get appropriate template based on reminder count
 */
export function getReminderTemplate(reminderCount: number, data: ReminderEmailData) {
  switch (reminderCount) {
    case 0:
      return getDayOneTemplate(data)
    case 1:
      return getDayThreeTemplate(data)
    case 2:
      return getDaySevenTemplate(data)
    default:
      return getDayOneTemplate(data)
  }
}
