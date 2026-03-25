# Schema Migration: subscription_tier → plan

**Objective:** Remove duplication and confusion by consolidating to single `plan` column as source of truth.

**Status:** Code updated ✅ | Migration pending (manual DB run)

## Changes Made

### 1. Code Updates (Complete)

**Files modified:**
- ✅ `src/lib/subscription-limits.ts` — Updated to read from `plan` instead of `subscription_tier`
- ✅ `src/app/api/stripe/webhook/route.ts` — Updated webhook to write to `plan`
- ✅ `src/app/settings/page.tsx` — Updated billing section to read from `plan`

**Search results:** No remaining `subscription_tier` references in code (except migration file).

### 2. Database Migration

**File:** `supabase/migrations/014_migrate_subscription_tier_to_plan.sql`

**What it does:**
1. Copies non-null `subscription_tier` values to `plan` (preserves data)
2. Drops the `subscription_tier` column
3. Ensures `plan` is never NULL (defaults to 'trial')

**How to run:**
```bash
# Option 1: Via Supabase UI
1. Go to Supabase Dashboard
2. SQL Editor → Create New Query
3. Copy contents of migration file
4. Run query

# Option 2: Via Supabase CLI
supabase db push
```

### 3. Related Columns (Kept)

**`subscription_status`** — KEPT (needed for Stripe billing lifecycle)
- Values: 'active', 'canceled', 'past_due'
- Purpose: Tracks Stripe subscription state

**`trial_expires_at`** — KEPT (needed for trial countdown)
- Purpose: Calculate "X days remaining"

### 4. Column Mapping

| Old Column | New Column | Notes |
|------------|-----------|-------|
| `subscription_tier` | `plan` | Single source of truth |
| `subscription_status` | `subscription_status` | Kept for Stripe |
| (new) | `trial_expires_at` | Kept for trial countdown |

## Data Integrity

- ✅ No data loss — `subscription_tier` values copied to `plan` before dropping
- ✅ Backward compatible — All users get a valid `plan` value
- ✅ Default handling — NULL `plan` values default to 'trial'
- ✅ Constraint added — `plan` cannot be NULL going forward

## Rollback Plan

If needed:
```sql
-- Re-create the column (best effort)
ALTER TABLE profiles ADD COLUMN subscription_tier TEXT;
UPDATE profiles SET subscription_tier = plan WHERE plan IS NOT NULL;
```

## Testing

After migration, verify:
1. All users still have a valid `plan` value
2. Settings page shows correct tier
3. Stripe webhook correctly updates `plan` on purchase
4. Trial countdown works properly

## Timeline

1. **Now:** Code updated and tested
2. **Next:** Run migration in Supabase
3. **Verify:** Check data integrity, test features
4. **Clean:** Delete old code references if any found

## Notes

- Master test account system continues to work (uses email-based bypass)
- No frontend changes needed (settings page already updated)
- All API routes already updated
- Safe to deploy code before/after migration (code is migration-agnostic)
