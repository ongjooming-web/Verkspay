-- Add trial tracking and AI usage tracking to profiles table
-- Supports 15-day free trial model (no free tier) and rate-limited AI features
--
-- Plan limits for AI Insights:
-- trial: 10/month (full Pro access for 15 days)
-- starter: 10/month
-- pro: 30/month
-- enterprise: unlimited

-- 1. Add subscription & trial columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'pro', 'enterprise'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP DEFAULT (NOW() + INTERVAL '15 days');
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_expired BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 2. Add AI usage tracking columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insights_generated_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insights_usage_reset_date TIMESTAMP DEFAULT DATE_TRUNC('month', NOW());

-- 3. Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expired ON profiles(trial_expired);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_end_date ON profiles(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);

-- 4. Add column comments for documentation
COMMENT ON COLUMN profiles.plan IS 'Subscription plan: trial, starter, pro, or enterprise. Defaults to trial for all users.';
COMMENT ON COLUMN profiles.trial_start_date IS 'When the user started their 15-day free trial (defaults to migration timestamp for existing users).';
COMMENT ON COLUMN profiles.trial_end_date IS 'When the user''s 15-day trial expires (start_date + 15 days).';
COMMENT ON COLUMN profiles.trial_expired IS 'Flag indicating if trial has expired. Used for quick filtering without timestamp comparisons.';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe subscription ID for future Stripe billing integration.';
COMMENT ON COLUMN profiles.insights_generated_count IS 'Total AI Insights generated in the current billing period.';
COMMENT ON COLUMN profiles.insights_usage_reset_date IS 'Start of the current billing month for usage tracking (reset monthly).';
