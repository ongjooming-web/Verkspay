# Fix: Service Role Key Not Set in Vercel

## Problem
Account deletion fails with `error_code: "not_admin"` (403).

This means the API route is NOT using the service role key — it's likely using the anon key or the key is missing/wrong.

## Solution

### Step 1: Get the Service Role Key from Supabase

1. Go to: https://app.supabase.com
2. Select your **Prism project**
3. Click **Settings** (bottom left) → **API**
4. Under **Project API keys**, you'll see two keys:
   - **anon public** — for frontend (public, safe to expose)
   - **service_role secret** — for backend (PRIVATE, never expose)

5. **Copy the `service_role secret` key** (NOT the anon key)

### Step 2: Add to .env.local (Local Development)

Create or edit `prism/.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

(Paste your actual service role key here)

### Step 3: Add to Vercel (Production)

1. Go to: https://vercel.com
2. Select your **Prism project**
3. Click **Settings** → **Environment Variables**
4. Click **Add New**
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** (paste your service role key from Step 1)
   - **Environments:** Check all (Production, Preview, Development)
5. Click **Save**

### Step 4: Verify the Key

Run this to verify:

```bash
node verify-keys.js
```

Expected output:
```
Service Role Key:
  Present: true
  First 10 chars: eyJhbGciOi...
  Role: service_role  ✓
```

## How to Tell if You Have the Right Key

### Service Role Key (CORRECT ✓)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2ZxZGlwdWJieXZla2hpcG...
```
When decoded, payload has: `"role":"service_role"`

### Anon Key (WRONG ✗)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2ZxZGlwdWJieXZla2hpcG...
```
When decoded, payload has: `"role":"anon"`

## After Making Changes

1. **Local development:**
   - Restart your dev server (`npm run dev`)
   - Test account deletion

2. **Production (Vercel):**
   - Vercel auto-redeploys when you add environment variables
   - Wait ~2 minutes for the deployment
   - Test account deletion on https://app.prismops.xyz

## What the API Route Does With the Service Role Key

```typescript
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // ← Uses service role (admin access)
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Now this works:
await supabaseAdmin.auth.admin.deleteUser(userId)  // ← Only works with service role
```

If you use the anon key instead, you get `error_code: "not_admin"` (403).

## Logs to Check

After setting the key, look at Vercel logs:

```
[Delete Init] Service role key found, first 10 chars: eyJhbGciOi...
[Delete Init] Admin client created
[Delete] ✓ User authenticated
[Delete] Deleting auth user...
[Delete] Admin client has auth.admin: true
[Delete] Admin client has auth.admin.deleteUser: true
[Delete] Service role key being used: eyJhbGciOi...
[Delete] Auth user deleted successfully  ✓
```

If you see errors about "not_admin", the key is wrong.
