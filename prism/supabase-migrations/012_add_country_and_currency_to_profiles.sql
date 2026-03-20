-- Add country and currency fields to profiles table
-- This enables multi-country support with per-user currency settings

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'MYR';

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON profiles(country_code);
CREATE INDEX IF NOT EXISTS idx_profiles_currency_code ON profiles(currency_code);

-- Set default country_code to Malaysia for existing users
UPDATE profiles SET country_code = 'MY' WHERE country_code IS NULL;

-- Make country_code not null with default
ALTER TABLE profiles ALTER COLUMN country_code SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN country_code SET DEFAULT 'MY';
