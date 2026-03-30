import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      )
    }

    // Verify token exists and is not expired
    const supabase = getSupabaseServer()
    const { data: portalToken, error: tokenError } = await supabase
      .from('client_portal_tokens')
      .select('client_id, expires_at, used_at')
      .eq('token', token)
      .single()

    if (tokenError || !portalToken) {
      console.error('[ClientPortal] Invalid token:', token)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if token is expired
    if (new Date(portalToken.expires_at) < new Date()) {
      console.error('[ClientPortal] Token expired:', token)
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      )
    }

    const clientId = portalToken.client_id

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email, business_name')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      console.error('[ClientPortal] Client not found:', clientId)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get invoices for this client
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, invoice_number, created_at, due_date, amount, status, currency')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (invoicesError) {
      console.error('[ClientPortal] Failed to fetch invoices:', invoicesError)
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      )
    }

    // Log access if first time
    if (!portalToken.used_at) {
      await supabase
        .from('client_portal_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token)
    }

    // Calculate summary stats
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
    const paidAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0)
    const unpaidAmount = totalAmount - paidAmount

    return NextResponse.json({
      client,
      invoices,
      summary: {
        total_invoices: invoices.length,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        unpaid_amount: unpaidAmount,
        overdue_count: invoices.filter(inv => 
          inv.status === 'unpaid' && new Date(inv.due_date) < new Date()
        ).length,
      },
    })
  } catch (error) {
    console.error('[ClientPortal] Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
