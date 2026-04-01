-- Add payment details columns to profiles table for multi-user SaaS support
-- Each user can have their own bank account and payment instructions

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS duitnow_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_payment_details ON profiles(bank_name, bank_account_number);

COMMENT ON COLUMN profiles.bank_name IS 'Bank name (e.g., Maybank, CIMB, etc.)';
COMMENT ON COLUMN profiles.bank_account_number IS 'Bank account number for invoice payment';
COMMENT ON COLUMN profiles.bank_account_name IS 'Account holder name';
COMMENT ON COLUMN profiles.duitnow_id IS 'DuitNow ID for quick transfer';
COMMENT ON COLUMN profiles.payment_instructions IS 'Additional payment instructions to show on invoices';
