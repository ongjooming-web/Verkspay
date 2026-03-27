-- Create recurring_invoices table for storing invoice templates that auto-generate
CREATE TABLE IF NOT EXISTS public.recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Template content (used to generate each invoice)
  description TEXT,
  line_items JSONB,
  amount NUMERIC(12, 2) NOT NULL,
  currency_code VARCHAR DEFAULT 'MYR',
  payment_terms TEXT,
  
  -- Schedule
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means no end date (continues indefinitely)
  next_generate_date DATE NOT NULL, -- next date to auto-create an invoice draft
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  
  -- Tracking
  invoices_generated INTEGER DEFAULT 0,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own recurring invoices
CREATE POLICY "Users can manage their own recurring invoices"
ON public.recurring_invoices
FOR ALL
USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_recurring_invoices_user_id ON public.recurring_invoices(user_id);
CREATE INDEX idx_recurring_invoices_client_id ON public.recurring_invoices(client_id);
CREATE INDEX idx_recurring_invoices_status ON public.recurring_invoices(status);
CREATE INDEX idx_recurring_invoices_next_generate_date ON public.recurring_invoices(next_generate_date);

-- Add reference to invoices table (link generated invoices back to template)
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS recurring_invoice_id UUID REFERENCES public.recurring_invoices(id) ON DELETE SET NULL;

-- Index the foreign key on invoices
CREATE INDEX IF NOT EXISTS idx_invoices_recurring_invoice_id ON public.invoices(recurring_invoice_id);

COMMENT ON TABLE public.recurring_invoices IS 'Templates for automatically generating invoice drafts on a schedule';
COMMENT ON COLUMN public.recurring_invoices.next_generate_date IS 'Next date when this template should generate an invoice draft';
COMMENT ON COLUMN public.recurring_invoices.invoices_generated IS 'Count of invoices generated from this template';
