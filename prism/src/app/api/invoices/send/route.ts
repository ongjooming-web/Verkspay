import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getInvoiceEmailTemplate } from '@/lib/emailTemplates/invoiceEmail'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'invoiceId is required' },
        { status: 400 }
      )
    }

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
        clients (
          name,
          email
        )
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

    const clientEmail = invoice.clients.email
    const clientName = invoice.clients.name
    const businessName = profile.business_name || profile.full_name || 'Prism User'

    if (!clientEmail) {
      return NextResponse.json(
        { error: 'Client email not found' },
        { status: 400 }
      )
    }

    // Generate email HTML
    const emailHtml = getInvoiceEmailTemplate({
      invoiceNumber: invoice.invoice_number,
      issueDate: invoice.created_at,
      dueDate: invoice.due_date,
      description: invoice.description,
      amount: invoice.amount,
      currencyCode: invoice.currency_code || 'MYR',
      paymentTerms: invoice.payment_terms,
      businessName,
      clientName,
      invoiceId
    })

    // Send email via Resend
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'support@prismops.xyz',
      to: clientEmail,
      subject: `Invoice ${invoice.invoice_number} from ${businessName}`,
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
      emailId: emailResult.id
    })
  } catch (error: any) {
    console.error('[invoices/send] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
