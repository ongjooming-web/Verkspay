/**
 * Generate a sequential recurring invoice template number for a user
 * Format: REC-0001, REC-0002, ..., REC-9999, REC-10000, etc.
 * Same logic as invoice numbering but for recurring templates
 */
export async function generateRecurringInvoiceNumber(
  userId: string,
  supabase: any
): Promise<string> {
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    try {
      // Get ALL recurring invoice numbers for this user
      const { data: recurringInvoices, error: fetchError } = await supabase
        .from('recurring_invoices')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (fetchError) {
        throw fetchError
      }

      let nextNum = 1

      if (recurringInvoices && recurringInvoices.length > 0) {
        // For recurring invoices, we'll use a simple counter based on count
        // Since we don't store the REC number in the template, count existing ones
        nextNum = recurringInvoices.length + 1
      }

      // Pad to 4 digits, or 5+ if it exceeds 9999
      const padLength = nextNum > 9999 ? nextNum.toString().length : 4
      const paddedNum = nextNum.toString().padStart(padLength, '0')
      const recurringNumber = `REC-${paddedNum}`

      console.log('[RecurringInvoiceNumbering] Generated number:', { userId, recurringNumber, attempt: attempts + 1 })
      return recurringNumber
    } catch (error: any) {
      if (error?.code !== 'PGRST116') {
        console.error('[RecurringInvoiceNumbering] Attempt', attempts + 1, '- Error:', error)
      }
      
      attempts++

      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100))
      }
    }
  }

  throw new Error(`Failed to generate recurring invoice number after ${maxAttempts} attempts`)
}

/**
 * Generate a sequential invoice number for a user
 * Format: INV-0001, INV-0002, ..., INV-9999, INV-10000, etc.
 * 
 * Handles race conditions by retrying if unique constraint is violated
 */
export async function generateInvoiceNumber(
  userId: string,
  supabase: any,
  skipAbove: number = 0  // skip numbers <= this (used when retrying after 23505)
): Promise<string> {
  // Fetch ALL invoice numbers for this user to find true maximum
  const { data: invoices, error: fetchError } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', userId)

  if (fetchError) throw fetchError

  let nextNum = skipAbove + 1

  if (invoices && invoices.length > 0) {
    const numbers = invoices
      .map((inv: any) => {
        const match = inv.invoice_number?.match(/^INV-(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter((n: number) => n > 0)

    if (numbers.length > 0) {
      nextNum = Math.max(Math.max(...numbers) + 1, skipAbove + 1)
    }
  }

  const padLength = nextNum > 9999 ? nextNum.toString().length : 4
  return `INV-${nextNum.toString().padStart(padLength, '0')}`
}
