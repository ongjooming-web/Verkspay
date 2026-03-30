-- Client Portal Schema (v1 - Magic Link Login)

-- Track portal access tokens (magic links)
CREATE TABLE IF NOT EXISTS client_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  
  -- Index for token lookups
  CONSTRAINT token_not_empty CHECK (token != '')
);

CREATE INDEX idx_client_portal_tokens_token ON client_portal_tokens(token);
CREATE INDEX idx_client_portal_tokens_client_id ON client_portal_tokens(client_id);

-- Portal session tracking (optional, for future analytics)
CREATE TABLE IF NOT EXISTS client_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES client_portal_tokens(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_client_portal_sessions_client_id ON client_portal_sessions(client_id);

-- Enable RLS on portal tables
ALTER TABLE client_portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can access (via API endpoints)
CREATE POLICY "Service role only" ON client_portal_tokens
  FOR ALL USING (FALSE) WITH CHECK (FALSE);

CREATE POLICY "Service role only" ON client_portal_sessions
  FOR ALL USING (FALSE) WITH CHECK (FALSE);
