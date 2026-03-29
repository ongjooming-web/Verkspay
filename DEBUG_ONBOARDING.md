# Debug: Onboarding Tour Not Showing

## Checklist

### 1. Check Browser Console
Open DevTools (F12) on app.prismops.xyz/dashboard and look for:
- `[useOnboarding] Hook mounted, fetching status...`
- `[useOnboarding] Status fetched:` (should show tour_step, completed, etc.)
- `[Tour] Pathname changed to:` (after navigation)

### 2. Check Vercel Logs
Go to https://vercel.com → Prism → Deployments → Latest → Logs
Search for:
- `[Onboarding Status]` — API endpoint logs
- `Failed to compile` — build errors
- `error` — any server errors

### 3. Most Likely Issue: Migration Not Applied

**The Problem:**
Vercel doesn't automatically run Supabase migrations. The columns might not exist yet:
- `onboarding_completed` 
- `onboarding_step`
- `onboarding_dismissed_at`

**Solution:**
Manual step needed in Supabase Console:

1. Go to https://app.supabase.com → Your Prism Project
2. Click **SQL Editor**
3. Run this query:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMP DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step ON profiles(onboarding_step);
```

4. Click **Execute**
5. Refresh app.prismops.xyz — tour should now show!

### 4. Verify API Works

Test the onboarding API manually:

```bash
# Get your JWT token (from browser DevTools > Application > Cookies > sb-token or similar)
# Then run:

curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://app.prismops.xyz/api/onboarding/status
```

Should return:
```json
{
  "completed": false,
  "dismissed": false,
  "tour_step": 0,
  "tasks": {...},
  "completed_count": 0,
  "total_tasks": 5
}
```

If you see a 404 or 500 error, the columns don't exist yet.

### 5. If Still Not Working

Check:
- [ ] Are you logged in? (check dashboard loads)
- [ ] Are you on the `/dashboard` path? (tour only shows on authenticated routes)
- [ ] Did you create a brand new account or an old one? (old accounts have NULL values)
- [ ] Does browser console show errors? (check for auth errors, CORS, etc.)

