-- Create recurring_invoices table for auto-generating invoice drafts
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
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
  last_generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recurring invoices"
  ON recurring_invoices
  FOR ALL
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_recurring_invoices_user_id ON recurring_invoices(user_id);
CREATE INDEX idx_recurring_invoices_client_id ON recurring_invoices(client_id);
CREATE INDEX idx_recurring_invoices_status ON recurring_invoices(status);
CREATE INDEX idx_recurring_invoices_next_generate_date ON recurring_invoices(next_generate_date);

-- Add reference column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_invoice_id UUID REFERENCES recurring_invoices(id) ON DELETE SET NULL;

-- Create index for linking invoices back to templates
CREATE INDEX idx_invoices_recurring_invoice_id ON invoices(recurring_invoice_id);
