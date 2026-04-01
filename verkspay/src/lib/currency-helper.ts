/**
 * Group invoice amounts by currency code
 * Prevents false currency conversions by keeping each currency separate
 */
export interface Invoice {
  amount: number
  currency_code?: string
}

export function groupByCurrency(invoices: Invoice[]): Record<string, number> {
  return invoices.reduce((acc, inv) => {
    const code = inv.currency_code || 'MYR'
    acc[code] = (acc[code] || 0) + (inv.amount || 0)
    return acc
  }, {} as Record<string, number>)
}

/**
 * Get all unique currencies from invoices (sorted)
 */
export function getUniqueCurrencies(invoices: Invoice[]): string[] {
  const codes = new Set(invoices.map(inv => inv.currency_code || 'MYR'))
  return Array.from(codes).sort()
}
