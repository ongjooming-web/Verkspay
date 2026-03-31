# Row-Level Security (RLS) Setup for Verkspay

## What is RLS?

Row-Level Security ensures that database queries respect user boundaries at the database level. Even if someone gets unauthorized access to a database key, they can only see their own data.

## Why Prism Needs RLS

Currently, Prism uses the service role key (which bypasses RLS) in all server routes. This is safe because:
- ✅ Service role key is kept secret in `.env`
- ✅ Never exposed to client
- ✅ Only used in server-side API routes

But if a user's ANON_KEY is leaked, without RLS they could query other users' data directly from the browser console.

With RLS:
- 🔒 Stolen anon key = can only see own data
- 🔒 Stolen session token = same protection
- 🔒 Compromised client = no data leakage

## How to Apply

### Step 1: Backup Your Database (Safety First!)
1. Go to **Supabase Console** → **Settings** → **Backups**
2. Click **Take a backup now**
3. Wait for backup to complete ✅

### Step 2: Apply RLS Policies
1. Go to **Supabase Console** → **SQL Editor**
2. Click **New Query**
3. Copy-paste the entire contents of `sql/rls-policies.sql`
4. Click **Run** (bottom right)
5. Wait for all statements to execute (should see green checkmarks)

### Step 3: Verify RLS Is Enabled
Run this query in SQL Editor:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

You should see all user data tables with `rowsecurity = true`:
```
invoices          | true
clients           | true
proposals         | true
payment_records   | true
profiles          | true
recurring_invoices| true
```

### Step 4: Verify Policies Exist
Run this query:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see policies like:
```
public | invoices  | Users can delete own invoices
public | invoices  | Users can insert own invoices
public | invoices  | Users can update own invoices
public | invoices  | Users can view own invoices
...
```

### Step 5: Test Prism Still Works
1. **Log in** to Verkspay (https://app.verkspay.com)
2. **Check dashboard** loads ✅
3. **Create an invoice** ✅
4. **View invoices list** ✅
5. **Go to Settings** ✅

If everything loads normally, RLS is working!

### Step 6: Security Test (Optional)
Open browser console and try:
```javascript
// Get your user ID
const { data: { user } } = await supabase.auth.getUser()
console.log('Your ID:', user.id)

// Try to see another user's invoices (change this to someone else's ID)
const { data } = await supabase
  .from('invoices')
  .select('*')
  .eq('user_id', 'some-other-user-id')

console.log(data) // Should be empty [] due to RLS
```

## Impact on Prism

### ✅ No Changes Needed
- Server routes (API) → Still work perfectly (service role bypasses RLS)
- Client hooks (useUserProfile, etc.) → Still work (users see own data)
- Dashboard, Invoices, Clients pages → Still work (no code changes)

### ✅ What Actually Changes
- Database security layer → Enforced at DB level
- Unauthorized access → Blocked by RLS policy
- Stolen anon key → Limited to user's own data

### ✅ Zero Code Changes Required
All existing code continues to work because:
1. Queries are already user-scoped (`eq('user_id', auth.uid())`)
2. RLS policies just enforce this at database level
3. Service role key bypasses RLS (used in server routes)
4. Anon key respects RLS (used in client, but doesn't need to)

## Rollback Plan (If Something Breaks)

If Prism breaks after adding RLS:

### Option 1: Revert from Backup
1. Go to **Supabase Console** → **Settings** → **Backups**
2. Find the backup you took before this
3. Click **Restore**
4. Choose point-in-time restore

### Option 2: Disable RLS
Run this in SQL Editor to disable RLS on all tables:
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders_log DISABLE ROW LEVEL SECURITY;
```

### Option 3: Drop and Recreate Policies
If a specific policy is broken:
```sql
DROP POLICY "Users can view own invoices" ON invoices;
-- Then re-create it from rls-policies.sql
```

## What Gets Protected

### By RLS
```
User A queries → Can see User A's invoices ✅
User A queries → Cannot see User B's invoices ❌ (blocked by RLS)
User A queries → Cannot see User B's clients ❌ (blocked by RLS)
```

### By Service Role Key (Already Protected)
```
Server route with service key → Can see all data ✅ (intentional)
Server route logs queries → Audit trail
```

## Files
- `sql/rls-policies.sql` → All RLS policies (run in SQL Editor)
- `RLS_SETUP.md` → This file (setup instructions)

## Questions?

If RLS causes issues:
1. Check browser console for errors
2. Check Supabase logs for policy violations
3. Verify policies in SQL Editor
4. Restore from backup if needed

---

**Timeline:** ~5 minutes to apply + ~1 minute to test = Done! 🎉
