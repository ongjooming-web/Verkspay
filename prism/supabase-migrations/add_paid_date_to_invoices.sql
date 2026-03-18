-- Add paid_date column to invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_date timestamptz;

-- Add comment for clarity
COMMENT ON COLUMN public.invoices.paid_date IS 'Timestamp when invoice was marked as paid';
