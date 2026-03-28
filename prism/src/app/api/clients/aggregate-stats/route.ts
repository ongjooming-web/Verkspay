import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { autoTagAllClients } from '@/lib/auto-tag'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/clients/aggregate-stats - Calculate and cache stats for all clients
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data, error: authError } = await supabase.auth.getUser(token)

    if (authError || !data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = data.user.id

    // Get all clients for this user
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)

    if (clientsError) {
      console.error('[AggregateStats] Error fetching clients:', clientsError)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({ updated: 0 })
    }

    // For each client, calculate stats from invoices
    const stats: any[] = []

    for (const client of clients) {
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, amount, amount_paid, remaining_balance, created_at, status')
        .eq('client_id', client.id)

      if (invoicesError) {
        console.error('[AggregateStats] Error fetching invoices for client', client.id, invoicesError)
        continue
      }

      if (!invoices || invoices.length === 0) {
        stats.push({
          client_id: client.id,
          total_revenue: 0,
          total_outstanding: 0,
          last_invoice_date: null,
          invoice_count: 0
        })
        continue
      }

      // Calculate metrics
      const total_revenue = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)
      const total_outstanding = invoices.reduce((sum, inv) => sum + (inv.remaining_balance || 0), 0)
      const invoice_count = invoices.length
      const last_invoice_date = invoices
        .map((inv: any) => new Date(inv.created_at).getTime())
        .reduce((max, curr) => (curr > max ? curr : max), 0)

      stats.push({
        client_id: client.id,
        total_revenue,
        total_outstanding,
        last_invoice_date: last_invoice_date ? new Date(last_invoice_date).toISOString() : null,
        invoice_count
      })
    }

    // Update all clients with their stats
    for (const stat of stats) {
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          total_revenue: stat.total_revenue,
          total_outstanding: stat.total_outstanding,
          last_invoice_date: stat.last_invoice_date,
          invoice_count: stat.invoice_count
        })
        .eq('id', stat.client_id)

      if (updateError) {
        console.error('[AggregateStats] Error updating client', stat.client_id, updateError)
      }
    }

    console.log('[AggregateStats] Updated stats for', stats.length, 'clients')

    // Trigger auto-tagging in background (fire-and-forget)
    autoTagAllClients(userId).catch(err => {
      console.error('[AggregateStats] Auto-tag background job failed:', err)
    })

    return NextResponse.json({ updated: stats.length })
  } catch (err) {
    console.error('[AggregateStats] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
