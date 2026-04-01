-- Add missing columns to invoices table
-- This migration adds all columns referenced in the mark-paid API and invoice detail page

ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS paid_date timestamptz,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_recipient TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.invoices.paid_date IS 'Timestamp when invoice was marked as paid';
COMMENT ON COLUMN public.invoices.payment_method IS 'Payment method used (stripe, usd, manual)';
COMMENT ON COLUMN public.invoices.payment_recipient IS 'Recipient address or account (Stripe account ID or wallet address)';
