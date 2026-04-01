export type LineItem = {
  description: string
  quantity: number
  rate: number
  amount: number // quantity * rate, auto-calculated
}

export interface Invoice {
  id: string
  invoice_number: string
  user_id: string
  client_id: string
  client_name?: string
  amount: number
  status: string
  due_date: string
  description?: string
  currency_code?: string
  payment_terms?: string
  created_at?: string
  updated_at?: string
  amount_paid?: number
  remaining_balance?: number
  paid_date?: string
  line_items?: LineItem[] | null
}
