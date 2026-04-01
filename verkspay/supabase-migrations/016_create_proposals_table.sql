-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  proposal_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  scope_of_work TEXT,
  deliverables TEXT,
  timeline TEXT,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'MYR',
  line_items JSONB,
  valid_until DATE,
  payment_terms TEXT,
  terms_and_conditions TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined')),
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for user queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at);

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop first if they exist)
DROP POLICY IF EXISTS "Users can view their own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can insert their own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update their own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can delete their own proposals" ON proposals;

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

-- Create trigger for updated_at (drop first if exists)
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();
