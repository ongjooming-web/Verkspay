import { formatCurrency } from '../countries'

export interface InvoiceEmailData {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  description?: string
  amount: number
  currencyCode: string
  paymentTerms?: string
  businessName: string
  clientName: string
  invoiceId: string
}

export function getInvoiceEmailTemplate(data: InvoiceEmailData): string {
  const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.verkspay.com'}/pay/${data.invoiceId}`
  const formattedAmount = formatCurrency(data.amount, data.currencyCode)

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; color: #374151;">
        
        <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="margin-bottom: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">Invoice</h1>
            <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">${data.businessName}</p>
          </div>

          <!-- Invoice Details -->
          <div style="margin-bottom: 40px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px;">
              <!-- Left Column -->
              <div>
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Invoice Details</p>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Invoice Number:</td>
                    <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${data.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Issue Date:</td>
                    <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${new Date(data.issueDate).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Due Date:</td>
                    <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${new Date(data.dueDate).toLocaleDateString()}</td>
                  </tr>
                </table>
              </div>

              <!-- Right Column -->
              <div>
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Bill To</p>
                <p style="margin: 6px 0; color: #111827; font-weight: 600; font-size: 14px;">${data.clientName}</p>
              </div>
            </div>
          </div>

          <!-- Description -->
          ${data.description ? `
            <div style="margin-bottom: 40px; padding: 20px; background-color: #f3f4f6; border-radius: 6px;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Description</p>
              <p style="margin: 0; color: #111827; font-size: 14px; line-height: 1.6;">${data.description}</p>
            </div>
          ` : ''}

          <!-- Amount -->
          <div style="margin-bottom: 40px; padding: 20px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Amount Due</p>
            <p style="margin: 0; color: #1e40af; font-size: 32px; font-weight: 700;">${formattedAmount}</p>
          </div>

          <!-- Payment Terms -->
          ${data.paymentTerms ? `
            <div style="margin-bottom: 40px; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
              <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Payment Terms</p>
              <p style="margin: 0; color: #111827; font-size: 14px;">${data.paymentTerms}</p>
            </div>
          ` : ''}

          <!-- Download Invoice Button -->
          <div style="margin-bottom: 40px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.verkspay.com'}/api/invoices/${data.invoiceId}/pdf" style="display: inline-block; padding: 12px 32px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              📥 Download Invoice
            </a>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">Sent via <strong>Verkspay</strong> · verkspay.com</p>
            <p style="margin: 4px 0 0 0; color: #9ca3af;">Questions? Reply to this email</p>
          </div>

        </div>

      </body>
    </html>
  `
}
