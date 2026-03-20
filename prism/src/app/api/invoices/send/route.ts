import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getInvoiceEmailTemplate } from '@/lib/emailTemplates/invoiceEmail'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

// Send invoice via email or WhatsApp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, method = 'email', emailTo, emailCc, senderName, subject, emailMessage } = body

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'invoiceId is required' },
        { status: 400 }
      )
    }

    // If method is specified (from modal), use custom parameters
    const customEmail = method === 'email' && emailTo ? emailTo : null

    // Get auth user
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const { data: userData, error: authError } = await supabase.auth.getUser(token)

    if (authError || !userData?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = userData.user.id

    // Fetch invoice with client details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        amount,
        currency_code,
        description,
        created_at,
        due_date,
        payment_terms,
        client_id
      `)
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single()

    if (invoiceError || !invoice) {
      console.error('[invoices/send] Invoice not found:', invoiceError)
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, email, phone')
      .eq('id', invoice.client_id)
      .single()

    if (clientError || !client) {
      console.error('[invoices/send] Client not found:', clientError)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get freelancer's business name and currency code
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_name, full_name')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[invoices/send] Profile not found:', profileError)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const clientEmail = customEmail || client.email
    const clientName = client.name
    const businessName = profile.business_name || profile.full_name || 'Prism User'
    const finalSenderName = senderName || businessName

    if (!clientEmail) {
      return NextResponse.json(
        { error: 'Client email not found' },
        { status: 400 }
      )
    }

    // Determine which email template to use
    let emailHtml: string
    if (method === 'email' && emailMessage) {
      // Use custom message from modal
      emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; color: #374151;">
            <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <div style="white-space: pre-wrap; line-height: 1.6; color: #111827;">${emailMessage}</div>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">Sent via <strong>Prism</strong> · prismops.xyz</p>
              </div>
            </div>
          </body>
        </html>
      `
    } else {
      // Use default invoice template
      emailHtml = getInvoiceEmailTemplate({
        invoiceNumber: invoice.invoice_number,
        issueDate: invoice.created_at,
        dueDate: invoice.due_date,
        description: invoice.description,
        amount: invoice.amount,
        currencyCode: invoice.currency_code || 'MYR',
        paymentTerms: invoice.payment_terms,
        businessName: finalSenderName,
        clientName,
        invoiceId
      })
    }

    // Send email via Resend
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'support@prismops.xyz',
      to: clientEmail,
      cc: emailCc || undefined,
      subject: subject || `Invoice ${invoice.invoice_number} from ${finalSenderName}`,
      html: emailHtml
    })

    if (emailError) {
      console.error('[invoices/send] Resend error:', emailError)
      return NextResponse.json(
        { error: `Failed to send email: ${emailError.message}` },
        { status: 500 }
      )
    }

    console.log('[invoices/send] Email sent successfully:', emailResult)

    // Update invoice status to 'sent' and set sent_at
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('[invoices/send] Update error:', updateError)
      return NextResponse.json(
        { error: 'Email sent but failed to update invoice status' },
        { status: 500 }
      )
    }

    console.log('[invoices/send] Invoice status updated to sent')

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${clientEmail}`,
      emailId: emailResult?.id || 'unknown'
    })
  } catch (error: any) {
    console.error('[invoices/send] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
