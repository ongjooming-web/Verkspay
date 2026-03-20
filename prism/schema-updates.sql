-- Add payment_terms and sent_at columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
