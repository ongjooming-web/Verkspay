-- Add payment_recipient column to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_recipient TEXT;

-- This stores the payment address/account info (wallet address or Stripe account last 4)
-- for display purposes when invoice is marked as paid
