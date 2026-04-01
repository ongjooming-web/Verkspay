-- Create reminders_log table for tracking reminder sends
CREATE TABLE IF NOT EXISTS public.reminders_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- '3_day_overdue', '7_day_overdue', '14_day_overdue'
  days_overdue INT NOT NULL,
  email_sent BOOLEAN DEFAULT true,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(invoice_id, reminder_type) -- Prevent duplicate reminders
);

-- RLS
ALTER TABLE public.reminders_log ENABLE ROW LEVEL SECURITY;

-- Policy: Allow admins to view reminder logs
CREATE POLICY "Users can view reminder logs for their invoices"
ON public.reminders_log FOR SELECT
USING (
  invoice_id IN (
    SELECT id FROM public.invoices 
    WHERE created_by = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_reminders_log_invoice_id ON public.reminders_log(invoice_id);
CREATE INDEX idx_reminders_log_reminder_type ON public.reminders_log(reminder_type);
CREATE INDEX idx_reminders_log_created_at ON public.reminders_log(created_at);

COMMENT ON TABLE public.reminders_log IS 'Tracks automated payment reminders sent to clients (prevents duplicates)';
