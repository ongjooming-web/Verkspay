# Database Setup Instructions

## Step 1: Access Supabase Console

1. Go to [supabase.com](https://supabase.com)
2. Login to your account
3. Navigate to project: `verkspay` (fqdipubbyvekhipknxnr)

## Step 2: Run SQL Schema

### Option A: Direct SQL Editor (Recommended for quick setup)

1. In Supabase console, go to **SQL Editor**
2. Click **+ New Query**
3. Copy the entire contents of `supabase-schema.sql` from the repo
4. Paste into the query editor
5. Click **Run** button
6. Wait for success message

### Option B: Supabase CLI (Recommended for production)

```bash
# Install CLI
npm install -g supabase

# Link to project
supabase link --project-ref fqdipubbyvekhipknxnr

# Push database changes
supabase db push

# View database
supabase db remote list
```

## Step 3: Verify Schema

After running the SQL, verify tables were created:

1. Go to **Database** → **Tables**
2. You should see:
   - `profiles`
   - `clients`
   - `invoices`
   - `proposals`
   - `contracts`

3. Click each table to verify columns exist

## Step 4: Test Authentication

1. Go to **Authentication** → **Users**
2. Create a test user (or test signup at your deployed app)
3. Verify user appears in list

## Step 5: Enable Google OAuth (Optional but Recommended)

### 5a. Get Google Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project (or select existing)
3. Enable Google+ API
4. Go to **Credentials**
5. Create **OAuth 2.0 Client ID** (Web application)
6. Add authorized redirect URI: `https://fqdipubbyvekhipknxnr.supabase.co/auth/v1/callback`
7. Copy **Client ID** and **Client Secret**

### 5b. Configure in Supabase

1. In Supabase, go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Paste **Client ID** and **Client Secret**
4. Save

### 5c: Update Redirect URLs (After Vercel Deployment)

1. Go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   - `https://app.verkspay.com/auth/callback`
   - `http://localhost:3000/auth/callback`
3. Save

## Troubleshooting

### "Permission denied" when running SQL

- Login as project owner (not team member)
- Check you're on the correct project
- Try SQL Editor instead of CLI

### Tables exist but operations fail

- Check RLS (Row Level Security) is enabled
- Verify you're authenticated before querying
- Check browser console for error messages

### Can't find tables

- Refresh page
- Check you're in correct schema (should be `public`)
- Verify SQL ran without errors

### OAuth not working

- Verify Google credentials are valid
- Check OAuth consent screen is configured in Google Cloud
- Ensure redirect URI matches exactly (case-sensitive)

## Database Structure

### users (extends auth.users)
- `id` - UUID (primary key, references auth.users)
- `email` - TEXT (unique)
- `full_name` - TEXT
- `avatar_url` - TEXT
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

### clients
- `id` - UUID (primary key)
- `user_id` - UUID (foreign key to auth.users)
- `name` - TEXT
- `email` - TEXT
- `company` - TEXT
- `phone` - TEXT (optional)
- `address` - TEXT (optional)
- `created_at` - TIMESTAMP

### invoices
- `id` - UUID (primary key)
- `user_id` - UUID (foreign key)
- `client_id` - UUID (foreign key)
- `invoice_number` - TEXT (unique)
- `amount` - NUMERIC
- `status` - TEXT (draft, sent, paid, overdue)
- `due_date` - DATE
- `created_at` - TIMESTAMP

### proposals
- `id` - UUID (primary key)
- `user_id` - UUID (foreign key)
- `client_id` - UUID (foreign key)
- `proposal_number` - TEXT (unique)
- `title` - TEXT
- `amount` - NUMERIC
- `status` - TEXT (draft, sent, accepted, declined)
- `created_at` - TIMESTAMP

### contracts
- `id` - UUID (primary key)
- `user_id` - UUID (foreign key)
- `client_id` - UUID (foreign key)
- `title` - TEXT
- `status` - TEXT (draft, active, expired, terminated)
- `start_date` - DATE
- `end_date` - DATE
- `value` - NUMERIC
- `created_at` - TIMESTAMP

## RLS Policies

All tables have Row Level Security enabled with policies that:
- ✅ Users can only see their own data
- ✅ Users can only modify their own data
- ✅ Automatic data isolation

## Next Steps

- [ ] Set up Supabase schema
- [ ] Configure Google OAuth
- [ ] Test database operations
- [ ] Deploy to Vercel
- [ ] Test end-to-end flow
