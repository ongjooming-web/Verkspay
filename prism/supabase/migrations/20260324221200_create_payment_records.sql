-- Create payment_records table for tracking manual and automated payments
CREATE TABLE payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount_paid NUMERIC(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_type VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual', 'stripe', 'bank', 'crypto', etc.
  status VARCHAR(50) NOT NULL DEFAULT 'completed', -- 'completed', 'pending', 'failed'
  notes TEXT,
  tx_hash VARCHAR(255), -- Transaction hash for crypto payments
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_payment_records_invoice_id ON payment_records(invoice_id);
CREATE INDEX idx_payment_records_payment_date ON payment_records(payment_date);
CREATE INDEX idx_payment_records_status ON payment_records(status);

-- Enable RLS (Row Level Security)
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only view/edit payment records for their own invoices
CREATE POLICY "Users can view payment records for their invoices" ON payment_records
  FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payment records for their invoices" ON payment_records
  FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payment records for their invoices" ON payment_records
  FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payment records for their invoices" ON payment_records
  FOR DELETE
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );
