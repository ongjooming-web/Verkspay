import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateInvoiceHTML, InvoiceTemplateData } from '@/lib/templates/invoiceTemplate'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[invoices/pdf] GET request received')
  
  const errorResponse = (status: number, message: string) => {
    console.error(`[invoices/pdf] Error ${status}: ${message}`)
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { id: invoiceId } = await params
    console.log('[invoices/pdf] Processing invoice:', invoiceId)

    if (!invoiceId) return errorResponse(400, 'invoiceId is required')

    // Check if auth header is provided - if yes, verify ownership; if no, allow public access
    let userId: string | null = null
    const authHeader = request.headers.get('authorization')
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: userData, error: authError } = await supabase.auth.getUser(token)
      if (!authError && userData?.user) {
        userId = userData.user.id
        console.log('[invoices/pdf] Auth OK for user:', userId)
      }
    } else {
      console.log('[invoices/pdf] No auth provided - allowing public access')
    }

    // Fetch invoice (public access - no user_id filter)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) return errorResponse(404, 'Invoice not found')
    
    // If auth provided, verify ownership
    if (userId && invoice.user_id !== userId) {
      return errorResponse(403, 'You do not have permission to view this invoice')
    }
    console.log('[invoices/pdf] Invoice found:', invoice.invoice_number)

    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single()

    if (clientError || !client) return errorResponse(404, 'Client not found')

    // Fetch business profile (use invoice.user_id to get seller's profile)
    const sellerId = invoice.user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sellerId)
      .single()

    if (profileError || !profile) return errorResponse(404, 'Profile not found')

    // Calculate totals
    const subtotal = invoice.amount
    const taxRate = profile.tax_number ? 8 : 0
    const taxAmount = taxRate > 0 ? Math.round((subtotal * taxRate) / 100 * 100) / 100 : 0
    const total = subtotal + taxAmount

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prismops.xyz'
    const paymentUrl = `${appUrl}/pay/${invoice.id}`

    // Prepare template data
    const templateData: InvoiceTemplateData = {
      business_name: profile.business_name || profile.full_name || 'Business',
      business_email: profile.business_email,
      business_phone: profile.business_phone,
      business_address: profile.business_address,
      business_logo_url: profile.business_logo_url,
      business_reg_number: profile.business_reg_number,
      tax_number: profile.tax_number,
      invoice_number: invoice.invoice_number,
      created_at: invoice.created_at,
      due_date: invoice.due_date,
      payment_terms: invoice.payment_terms,
      description: invoice.description,
      currency_code: invoice.currency_code || 'MYR',
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      client_name: client.name,
      client_email: client.email,
      payment_url: paymentUrl
    }

    // Generate HTML
    const htmlContent = generateInvoiceHTML(templateData)
    console.log('[invoices/pdf] HTML generated, returning response')

    // Return as HTML (can be printed to PDF in browser)
    return new Response(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoice_number}.html"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error: any) {
    console.error('[invoices/pdf] Unexpected error:', error.message)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
