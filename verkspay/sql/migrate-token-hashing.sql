-- Migration: Update client_portal_tokens schema for token hashing
-- Run this in Supabase SQL Editor

-- Step 1: Add new columns for hashing + access tracking
ALTER TABLE client_portal_tokens
ADD COLUMN IF NOT EXISTS token_hash TEXT,
ADD COLUMN IF NOT EXISTS first_accessed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0;

-- Step 2: Make token_hash unique and add constraint
ALTER TABLE client_portal_tokens
ADD CONSTRAINT token_hash_unique UNIQUE (token_hash);

-- Step 3: Make token column nullable (it will be deprecated)
ALTER TABLE client_portal_tokens
ALTER COLUMN token DROP NOT NULL;

-- Step 4: Remove old token constraint if exists
ALTER TABLE client_portal_tokens
DROP CONSTRAINT IF EXISTS token_not_empty;

-- Step 5: Drop old token index (we'll use token_hash instead)
DROP INDEX IF EXISTS idx_client_portal_tokens_token;

-- Step 6: Create index on token_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_client_portal_tokens_token_hash ON client_portal_tokens(token_hash);

-- Step 7: Rename used_at to first_accessed_at for clarity (optional)
-- ALTER TABLE client_portal_tokens RENAME COLUMN used_at TO first_accessed_at;

-- Done! The table now supports token hashing
