# RLS Deployment Checklist - Prism Security Hardening

## 📋 Pre-Deployment

- [ ] Read `RLS_SETUP.md` (in prism folder)
- [ ] Understand RLS won't break Prism (zero code changes)
- [ ] Backup database (Supabase Console → Backups → Take Backup)
- [ ] Verify backup completed successfully

## 🚀 Deployment Steps

### Step 1: Open Supabase SQL Editor
- Go to https://app.supabase.com
- Select Prism project
- Click **SQL Editor**
- Click **New Query**

### Step 2: Copy RLS Policies
- Open `prism/sql/rls-policies.sql` (locally)
- Copy **ENTIRE** file contents
- Paste into SQL Editor

### Step 3: Run Policies
- Click **Run** button (bottom right)
- Wait for all statements to complete
- Should see green checkmarks for all queries ✅

### Step 4: Verify RLS Enabled
Run this verification query:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Expected result:** All tables should show `rowsecurity = true`:
```
clients           | true
invoices          | true
payment_methods   | true
payment_records   | true
profiles          | true
proposals         | true
recurring_invoices| true
reminders_log     | true
```

### Step 5: Verify Policies Exist
Run this query:
```sql
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected:** 32 policies (4 per table × 8 tables, except reminders_log has 2)

## 🧪 Post-Deployment Testing

### Test 1: Dashboard Loads
1. Go to https://app.prismops.xyz/login
2. Log in with test account
3. Should see dashboard normally ✅

### Test 2: Create Invoice
1. Go to Invoices page
2. Create a test invoice
3. Should save successfully ✅

### Test 3: Create Client
1. Go to Clients page
2. Create a test client
3. Should save successfully ✅

### Test 4: RLS Protection (Optional Security Check)
Open browser console and run:
```javascript
// Get your user ID
const { data: { user } } = await supabase.auth.getUser()
console.log('Your ID:', user.id)

// Try to access FAKE user's invoices
const { data, error } = await supabase
  .from('invoices')
  .select('*')
  .eq('user_id', '00000000-0000-0000-0000-000000000000')

console.log('Data:', data) // Should be empty []
console.log('Error:', error) // Should be null
```

**Expected:** `data = []` (empty, blocked by RLS policy) ✅

## ✅ Rollback Plan (If Needed)

### Option A: Restore from Backup
1. Supabase Console → Settings → Backups
2. Find backup from before RLS deployment
3. Click **Restore**
4. Confirm

### Option B: Disable RLS on All Tables
Run in SQL Editor:
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

Then test Prism loads normally.

## 📊 What's Protected Now

| Scenario | Before RLS | After RLS |
|----------|-----------|----------|
| Stolen anon key, query other user's invoices | ❌ Can see | ✅ Blocked |
| Compromised session, query other user's clients | ❌ Can see | ✅ Blocked |
| Leaked API key, direct DB query | ❌ Can see | ✅ Blocked |
| Legitimate user query | ✅ Can see own | ✅ Can see own |
| Server route (service role) | ✅ Can see all | ✅ Can see all |

## 📝 Documentation
- `RLS_SETUP.md` - Detailed setup with verification queries
- `sql/rls-policies.sql` - All RLS policy SQL statements
- `MEMORY.md` - Security standards for Prism

## 🎯 Success Criteria
- [ ] RLS enabled on all 8 tables
- [ ] 32 policies created successfully
- [ ] Dashboard loads normally
- [ ] Can create/view invoices, clients, proposals
- [ ] Security test shows RLS blocks cross-user access
- [ ] No code changes needed in Prism

---

**Estimated time:** 10 minutes (5 min deploy + 5 min testing) ⏱️

**Risk level:** Low (backed up, can rollback in 2 minutes) 🟢
