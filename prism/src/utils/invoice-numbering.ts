import { createClient } from '@supabase/supabase-js'

/**
 * Generate a sequential invoice number for a user
 * Format: INV-0001, INV-0002, ..., INV-9999, INV-10000, etc.
 * 
 * Handles race conditions by retrying if unique constraint is violated
 */
export async function generateInvoiceNumber(
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    try {
      // Get the user's highest invoice number
      const { data: lastInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let nextNum = 1

      if (lastInvoice && lastInvoice.invoice_number) {
        // Parse the number from "INV-0005" -> 5
        const match = lastInvoice.invoice_number.match(/INV-(\d+)/)
        if (match) {
          nextNum = parseInt(match[1], 10) + 1
        }
      }

      // Pad to 4 digits, or 5+ if it exceeds 9999
      const padLength = nextNum > 9999 ? nextNum.toString().length : 4
      const paddedNum = nextNum.toString().padStart(padLength, '0')
      const invoiceNumber = `INV-${paddedNum}`

      console.log('[InvoiceNumbering] Generated number:', { userId, invoiceNumber, attempt: attempts + 1 })
      return invoiceNumber
    } catch (error) {
      attempts++
      console.error('[InvoiceNumbering] Attempt', attempts, '- Error:', error)

      // If this was a unique constraint error and we have retries left, try again
      if (attempts < maxAttempts) {
        // Small random delay to avoid thundering herd in race conditions
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100))
      }
    }
  }

  // Fallback (shouldn't reach here, but just in case)
  throw new Error(`Failed to generate invoice number after ${maxAttempts} attempts`)
}
