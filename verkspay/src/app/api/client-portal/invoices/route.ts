import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { verifyTokenHash } from '@/lib/token-crypto'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      )
    }

    // Verify token against stored hash (or raw token for backward compatibility)
    const supabase = getSupabaseServer()
    
    // Try to fetch by token_hash first (new way)
    let portalToken = null
    
    // First try: look up by token_hash (secure, new tokens)
    const { data: hashedTokens, error: hashError } = await supabase
      .from('client_portal_tokens')
      .select('id, client_id, token_hash, expires_at, first_accessed_at, access_count')
      .not('token_hash', 'is', null)

    if (!hashError && hashedTokens && hashedTokens.length > 0) {
      for (const pt of hashedTokens) {
        try {
          if (verifyTokenHash(token, pt.token_hash)) {
            portalToken = pt
            break
          }
        } catch (e) {
          continue
        }
      }
    }

    // Fallback: look up by raw token (backward compatibility, old tokens)
    if (!portalToken) {
      const { data: rawTokens, error: rawError } = await supabase
        .from('client_portal_tokens')
        .select('id, client_id, token_hash, expires_at, first_accessed_at, access_count')
        .eq('token', token)
        .single()

      if (!rawError && rawTokens) {
        portalToken = rawTokens
      }
    }

    if (!portalToken) {
      console.error('[ClientPortal] Invalid token')
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if token is expired
    if (new Date(portalToken.expires_at) < new Date()) {
      console.error('[ClientPortal] Token expired')
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      )
    }

    const clientId = portalToken.client_id

    // Get client info (select only needed fields)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email, company')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      console.error('[ClientPortal] Client not found:', clientId)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get invoices for this client with payment records
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, invoice_number, created_at, due_date, amount, status, currency_code, description, line_items, payment_records(amount)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (invoicesError) {
      console.error('[ClientPortal] Failed to fetch invoices:', invoicesError)
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      )
    }

    // Update access tracking
    await supabase
      .from('client_portal_tokens')
      .update({
        first_accessed_at: portalToken.first_accessed_at || new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        access_count: (portalToken.access_count || 0) + 1,
      })
      .eq('id', portalToken.id)

    // Calculate summary stats
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
    
    // Paid: fully paid invoices + actual paid amounts for partial
    let paidAmount = 0
    invoices.forEach(inv => {
      if (inv.status === 'paid') {
        // Fully paid
        paidAmount += inv.amount || 0
      } else if (inv.status === 'paid_partial' && inv.payment_records) {
        // Partial: sum actual payments
        const actualPaid = (inv.payment_records as any[])
          .reduce((sum, pr) => sum + (pr.amount || 0), 0)
        paidAmount += actualPaid
      }
    })
    
    // Unpaid: only fully unpaid invoices (not partial, not paid)
    const unpaidAmount = invoices
      .filter(inv => inv.status === 'unpaid' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0)

    // Overdue: invoices with status 'overdue' OR unpaid/partial past due date
    const now = new Date()
    const overdueCount = invoices.filter(inv => {
      if (inv.status === 'paid') return false // Paid invoices can't be overdue
      if (inv.status === 'overdue') return true // Already marked overdue
      // Check if unpaid/partial and past due date
      return (inv.status === 'unpaid' || inv.status === 'paid_partial') && 
             new Date(inv.due_date) < now
    }).length

    return NextResponse.json({
      client,
      data: {
        invoices,
        summary: {
          total_invoices: invoices.length,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          unpaid_amount: unpaidAmount,
          overdue_count: overdueCount,
        },
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
