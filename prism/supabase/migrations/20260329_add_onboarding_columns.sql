-- Add onboarding tracking columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMP DEFAULT NULL;

-- Create indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step ON profiles(onboarding_step);

-- Add column comments
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether the user has completed or skipped the entire onboarding tour (true = never show tour again)';
COMMENT ON COLUMN profiles.onboarding_step IS 'Current step in the onboarding tour (0-7, or 8 when completed)';
COMMENT ON COLUMN profiles.onboarding_dismissed_at IS 'Timestamp when user dismissed the progress bar (null = not dismissed)';
