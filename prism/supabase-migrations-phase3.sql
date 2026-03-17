-- Phase 3 Step 1: Non-Custodial WalletConnect Integration
-- Add wallet and payment method fields to user_profiles

-- Create enums for payment methods and networks
CREATE TYPE payment_method_enum AS ENUM ('bank', 'usdc');
CREATE TYPE usdc_network_enum AS ENUM ('base', 'ethereum', 'solana');

-- Add columns to profiles table if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_method payment_method_enum DEFAULT 'bank';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS usdc_network usdc_network_enum DEFAULT 'base';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create webhook_config table for Alchemy integration (Step 2)
CREATE TABLE IF NOT EXISTS webhook_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_id TEXT UNIQUE,
  webhook_url TEXT,
  network usdc_network_enum NOT NULL,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_webhook UNIQUE(user_id, network)
);

-- Create payment_intents table to track USDC payment requests
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  amount_usdc NUMERIC(12, 2) NOT NULL,
  network usdc_network_enum NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  qr_code_data TEXT,
  tx_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
  completed_at TIMESTAMP,
  CONSTRAINT unique_invoice_intent UNIQUE(invoice_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_config_user_id ON webhook_config(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_config_network ON webhook_config(network);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_invoice_id ON payment_intents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);

-- Enable RLS for new tables
ALTER TABLE webhook_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_config
CREATE POLICY "Users can view their own webhook config"
  ON webhook_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhook config"
  ON webhook_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhook config"
  ON webhook_config FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhook config"
  ON webhook_config FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for payment_intents
CREATE POLICY "Users can view their own payment intents"
  ON payment_intents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment intents"
  ON payment_intents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment intents"
  ON payment_intents FOR UPDATE
  USING (auth.uid() = user_id);

-- Update profiles RLS to allow wallet updates
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create function to automatically mark invoices as paid when webhook confirms payment
CREATE OR REPLACE FUNCTION mark_invoice_as_paid_by_intent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE invoices
    SET status = 'paid', payment_method = 'usdc', updated_at = NOW()
    WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment intent completion
DROP TRIGGER IF EXISTS payment_intent_completed ON payment_intents;
CREATE TRIGGER payment_intent_completed
AFTER UPDATE ON payment_intents
FOR EACH ROW
EXECUTE FUNCTION mark_invoice_as_paid_by_intent();
