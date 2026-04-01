-- Migration: Consolidate subscription_tier into plan column
-- Date: 2026-03-25
-- Purpose: Remove duplication by using 'plan' as single source of truth

BEGIN;

-- Step 1: Copy any non-null subscription_tier values to plan (preserve existing data)
UPDATE profiles
SET plan = subscription_tier
WHERE subscription_tier IS NOT NULL
  AND plan IS NULL;

-- Step 2: If both columns have values, plan takes precedence (already set above)
-- No action needed - UPDATE above only updates NULL plan values

-- Step 3: Drop the redundant subscription_tier column
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_tier;

-- Step 4: Verify plan column has correct values
-- All users should have a plan value now
-- Check any remaining NULLs and set them to 'trial' (default)
UPDATE profiles
SET plan = 'trial'
WHERE plan IS NULL;

-- Step 5: Add constraint to ensure plan is never NULL
ALTER TABLE profiles
ALTER COLUMN plan SET NOT NULL;

-- Notes:
-- - subscription_status is kept (needed for Stripe billing lifecycle)
-- - trial_expires_at is kept (needed for trial countdown)
-- - All references to subscription_tier in code must be updated to use plan

COMMIT;
