-- Update invoice status check constraint to allow new status values
-- Old values: draft, sent, paid, overdue
-- New values: unpaid, paid, paid_partial, overdue

-- Drop the old constraint
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add new constraint with updated values
ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('unpaid', 'paid', 'paid_partial', 'overdue'));

-- Note: Existing invoices with status='draft' or 'sent' should be migrated
-- Run this migration if needed:
-- UPDATE public.invoices SET status = 'unpaid' WHERE status IN ('draft', 'sent');
