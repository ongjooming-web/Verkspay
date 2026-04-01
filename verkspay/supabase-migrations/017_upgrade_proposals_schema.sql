-- Upgrade proposals table with all required columns for new proposal feature
-- This safely adds missing columns without dropping the table

ALTER TABLE proposals 
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS scope_of_work TEXT,
  ADD COLUMN IF NOT EXISTS deliverables TEXT,
  ADD COLUMN IF NOT EXISTS timeline TEXT,
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS line_items JSONB,
  ADD COLUMN IF NOT EXISTS valid_until DATE,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE;

-- Rename 'amount' to 'total_amount' if 'amount' exists and 'total_amount' is still null
UPDATE proposals SET total_amount = amount WHERE total_amount IS NULL AND amount IS NOT NULL;

-- Ensure default values
ALTER TABLE proposals ALTER COLUMN total_amount SET DEFAULT 0;
ALTER TABLE proposals ALTER COLUMN currency_code SET DEFAULT 'MYR';
ALTER TABLE proposals ALTER COLUMN status SET DEFAULT 'draft';

-- Create or update indexes
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at);

-- Ensure RLS is enabled
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can insert their own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update their own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can delete their own proposals" ON proposals;

-- Create fresh RLS policies
CREATE POLICY "Users can view their own proposals"
  ON proposals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own proposals"
  ON proposals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proposals"
  ON proposals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proposals"
  ON proposals
  FOR DELETE
  USING (auth.uid() = user_id);

-- Update trigger if it exists
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();
