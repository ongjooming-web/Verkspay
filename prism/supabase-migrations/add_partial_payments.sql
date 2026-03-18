-- Partial Payments Feature Migration
-- Adds support for tracking partial payments and payment history

-- 1. Fix invoice status constraint to allow new status values
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('unpaid', 'paid', 'paid_partial', 'overdue'));

-- 2. Add partial payment tracking columns to invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC;

-- 3. Create payment_records table for payment history
CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create index on invoice_id for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_records_invoice_id ON public.payment_records(invoice_id);

-- 5. Enable RLS on payment_records
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policy - users can only see payment records for their invoices
CREATE POLICY "Users can view payment records for their invoices"
ON public.payment_records FOR SELECT
USING (
  invoice_id IN (
    SELECT id FROM public.invoices WHERE user_id = auth.uid()
  )
);

-- 7. Create RLS policy - users can only insert payment records for their invoices
CREATE POLICY "Users can insert payment records for their invoices"
ON public.payment_records FOR INSERT
WITH CHECK (
  invoice_id IN (
    SELECT id FROM public.invoices WHERE user_id = auth.uid()
  )
);

-- 8. Populate remaining_balance for existing invoices
UPDATE public.invoices 
SET remaining_balance = COALESCE(amount - amount_paid, amount);

-- 9. Add comment for documentation
COMMENT ON TABLE public.payment_records IS 'Tracks individual partial payments for invoices. When amount_paid >= invoice.amount, invoice status is set to paid.';
COMMENT ON COLUMN public.invoices.amount_paid IS 'Total amount paid so far (sum of all payment_records for this invoice)';
COMMENT ON COLUMN public.invoices.remaining_balance IS 'Remaining amount owed (amount - amount_paid)';
