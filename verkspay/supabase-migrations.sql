-- Phase 2 Database Migrations

-- Add notes and contact history support to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP;

-- Create client_notes table for contact history
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('call', 'email', 'meeting', 'general', 'proposal', 'invoice')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create payment_records table for mock USDC payments
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_type TEXT DEFAULT 'usdc' CHECK (payment_type IN ('usdc', 'card', 'bank')),
  amount_paid NUMERIC(12, 2) NOT NULL,
  payment_date TIMESTAMP DEFAULT NOW(),
  tx_hash TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add payment status tracking to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_client_notes_user_id ON client_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_invoice_id ON payment_records(invoice_id);

-- Enable RLS for new tables
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for client_notes
CREATE POLICY "Users can view their own client notes" ON client_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own client notes" ON client_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client notes" ON client_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client notes" ON client_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for payment_records
CREATE POLICY "Users can view their own payment records" ON payment_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment records" ON payment_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment records" ON payment_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment records" ON payment_records FOR DELETE
  USING (auth.uid() = user_id);
