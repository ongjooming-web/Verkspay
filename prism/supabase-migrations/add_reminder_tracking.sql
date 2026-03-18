-- Add reminder tracking columns to invoices table
-- Migration: Smart Payment Reminders (2026-03-18)

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS reminder_sent_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

-- Create index on overdue invoices for efficient querying
CREATE INDEX IF NOT EXISTS idx_invoices_overdue_unpaid 
ON public.invoices(user_id, due_date, status)
WHERE status = 'unpaid' AND due_date < NOW();

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.reminder_sent_count IS 'Number of payment reminders sent (0-3). Incremented after each reminder email sent to client.';
COMMENT ON COLUMN public.invoices.last_reminder_sent_at IS 'Timestamp of the most recent reminder email sent. Used to track reminder escalation schedule.';
