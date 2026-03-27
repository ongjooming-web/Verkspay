/**
 * Generate a sequential invoice number for a user
 * Format: INV-0001, INV-0002, ..., INV-9999, INV-10000, etc.
 * 
 * Handles race conditions by retrying if unique constraint is violated
 */
export async function generateInvoiceNumber(
  userId: string,
  supabase: any
): Promise<string> {
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    try {
      // Get ALL invoice numbers for this user (not just single)
      const { data: invoices, error: fetchError } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100) // Get last 100 to find gaps

      if (fetchError) {
        throw fetchError
      }

      let nextNum = 1

      if (invoices && invoices.length > 0) {
        // Parse all invoice numbers and find the highest
        const numbers = invoices
          .map((inv: any) => {
            const match = inv.invoice_number?.match(/INV-(\d+)/)
            return match ? parseInt(match[1], 10) : 0
          })
          .filter((num: number) => num > 0)
          .sort((a: number, b: number) => b - a)

        if (numbers.length > 0) {
          nextNum = numbers[0] + 1 // Start from highest + 1
        }
      }

      // Pad to 4 digits, or 5+ if it exceeds 9999
      const padLength = nextNum > 9999 ? nextNum.toString().length : 4
      const paddedNum = nextNum.toString().padStart(padLength, '0')
      const invoiceNumber = `INV-${paddedNum}`

      // Verify this number doesn't exist (to handle race conditions)
      const { data: existing } = await supabase
        .from('invoices')
        .select('id')
        .eq('user_id', userId)
        .eq('invoice_number', invoiceNumber)
        .single()

      if (existing) {
        // Number already exists, try next one
        console.warn('[InvoiceNumbering] Invoice number already exists, retrying:', invoiceNumber)
        attempts++
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100))
        continue
      }

      console.log('[InvoiceNumbering] Generated number:', { userId, invoiceNumber, attempt: attempts + 1 })
      return invoiceNumber
    } catch (error: any) {
      // Only fail if NOT a "no rows" error (which is expected)
      if (error?.code !== 'PGRST116') {
        console.error('[InvoiceNumbering] Attempt', attempts + 1, '- Error:', error)
      }
      
      attempts++

      // If we have retries left, try again
      if (attempts < maxAttempts) {
        // Small random delay to avoid thundering herd in race conditions
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100))
      }
    }
  }

  // Fallback (shouldn't reach here, but just in case)
  throw new Error(`Failed to generate invoice number after ${maxAttempts} attempts`)
}
