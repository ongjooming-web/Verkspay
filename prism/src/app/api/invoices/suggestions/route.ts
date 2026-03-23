import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-server'

export type InvoiceSuggestion = {
  // Most recently used payment terms for this client
  payment_terms: string | null

  // Most recently used currency
  currency_code: string | null

  // Suggested line items based on frequency
  suggested_line_items: {
    description: string
    rate: number
    quantity: number
    frequency: number // how many times this line item appeared
  }[]

  // Average invoice amount for this client
  average_amount: number | null

  // Number of past invoices (so frontend can show confidence)
  invoice_count: number
}

export async function GET(request: NextRequest) {
  try {
    // Extract clientId from query params
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    // 1. Validate clientId
    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId parameter is required' },
        { status: 400 }
      )
    }

    // 2. Verify authentication
    const { user, error: authError } = await requireAuth(request)
    if (authError) {
      console.error('[invoices/suggestions] Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      )
    }

    const userId = user.id
    const supabase = getSupabaseServer()

    console.log(`[invoices/suggestions] Fetching suggestions for client ${clientId}, user ${userId}`)

    // 3. Query all past invoices for this client (auth check: user_id must match)
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (invoicesError) {
      console.error('[invoices/suggestions] Error fetching invoices:', invoicesError)
      return NextResponse.json(
        { error: 'Failed to fetch invoice history' },
        { status: 500 }
      )
    }

    // 4. If no invoices, return empty suggestions
    if (!invoices || invoices.length === 0) {
      console.log(`[invoices/suggestions] No invoices found for client ${clientId}`)
      return NextResponse.json<InvoiceSuggestion>({
        payment_terms: null,
        currency_code: null,
        suggested_line_items: [],
        average_amount: null,
        invoice_count: 0
      })
    }

    // 5. Analyze invoice history and build suggestions
    const invoiceCount = invoices.length

    // Get most recent payment_terms (if column exists)
    const payment_terms = invoices[0]?.payment_terms || null

    // Get user's currency preference from their profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('currency_code')
      .eq('id', userId)
      .single()

    const currency_code = profile?.currency_code || null

    // Calculate average invoice amount
    const totalAmount = invoices.reduce((sum, inv) => {
      const amount = parseFloat(inv.amount?.toString() || '0')
      return sum + amount
    }, 0)
    const average_amount = invoiceCount > 0 ? totalAmount / invoiceCount : null

    // 6. Extract and normalize suggested line items
    // Note: Since invoices table has line_items JSONB column, we extract from there
    // If line_items exists, parse it; otherwise, use description + amount as fallback
    const lineItemMap = new Map<string, {
      description: string
      rate: number
      quantity: number
      frequency: number
      lastCasing: string
    }>()

    invoices.forEach((invoice) => {
      if (invoice.line_items && Array.isArray(invoice.line_items) && invoice.line_items.length > 0) {
        // Parse line items from JSONB
        invoice.line_items.forEach((lineItem: any) => {
          const description = (lineItem.description || '').trim() || 'Service'
          const normalizedDesc = description.toLowerCase()
          const rate = parseFloat(lineItem.rate?.toString() || '0')
          const quantity = parseFloat(lineItem.quantity?.toString() || '1')

          if (lineItemMap.has(normalizedDesc)) {
            const existing = lineItemMap.get(normalizedDesc)!
            existing.frequency += 1
            existing.lastCasing = description
          } else {
            lineItemMap.set(normalizedDesc, {
              description: description,
              rate: rate,
              quantity: quantity,
              frequency: 1,
              lastCasing: description
            })
          }
        })
      } else {
        // Fallback: treat invoice description + amount as a single line item
        const description = (invoice.description || '').trim() || 'Service'
        const normalizedDesc = description.toLowerCase()
        const rate = parseFloat(invoice.amount?.toString() || '0')
        const quantity = 1

        if (lineItemMap.has(normalizedDesc)) {
          const existing = lineItemMap.get(normalizedDesc)!
          existing.frequency += 1
          existing.lastCasing = description
        } else {
          lineItemMap.set(normalizedDesc, {
            description: description,
            rate: rate,
            quantity: quantity,
            frequency: 1,
            lastCasing: description
          })
        }
      }
    })

    // 7. Convert map to array and sort by frequency (descending)
    const suggested_line_items = Array.from(lineItemMap.values())
      .map(item => ({
        description: item.lastCasing, // Use most recent casing
        rate: item.rate,
        quantity: item.quantity,
        frequency: item.frequency
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10) // Limit to top 10 suggestions

    console.log(`[invoices/suggestions] Generated ${suggested_line_items.length} line item suggestions`)

    // 8. Return suggestions
    const suggestions: InvoiceSuggestion = {
      payment_terms,
      currency_code,
      suggested_line_items,
      average_amount: average_amount ? parseFloat(average_amount.toFixed(2)) : null,
      invoice_count: invoiceCount
    }

    return NextResponse.json(suggestions, { status: 200 })
  } catch (error: any) {
    console.error('[invoices/suggestions] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
