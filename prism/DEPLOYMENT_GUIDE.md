# Verkspay Dashboard - Complete Deployment Guide

## 🚀 Quick Start (5 minutes)

### 1. Database Setup (CRITICAL!)
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. Copy everything from `supabase_setup.sql` in this repo
5. Paste into the SQL editor and click **Run**

This creates all necessary tables with proper RLS (Row Level Security).

### 2. Environment Setup
Create `.env.local` in project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
```

Get these from Supabase: **Project Settings** → **API** → **Project URL** and **Anon Key**

### 3. Install Dependencies
```bash
npm install
```

### 4. Test Locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Test the Full Flow
1. Click **Get Started** → **Create Account**
2. Sign up with test email (e.g., test@example.com)
3. Login with those credentials
4. Should redirect to `/dashboard`
5. Create a test client, invoice, and proposal
6. View stats on dashboard (should show real data)

---

## 📋 What's Included

### Pages (All Functional)
- ✅ **Home** (`/`) - Landing page with features
- ✅ **Login** (`/login`) - Fixed redirect to dashboard
- ✅ **Signup** (`/signup`) - Account creation
- ✅ **Dashboard** (`/dashboard`) - Real stats from database
- ✅ **Clients** (`/clients`) - Full CRUD with stats per client
- ✅ **Invoices** (`/invoices`) - Full CRUD with client names
- ✅ **Proposals** (`/proposals`) - Full CRUD with client names
- ✅ **Settings** (`/settings`) - Profile, crypto wallet, billing

### Features
- Real-time data loading from Supabase
- User authentication with email/password
- Client relationship management
- Invoice tracking (draft, sent, paid, overdue)
- Proposal tracking (draft, sent, accepted, declined)
- Crypto wallet settings (Base, Ethereum, Polygon, Solana)
- Recent activity feed
- Responsive glassmorphism design
- Row Level Security for data privacy

---

## 📦 Database Schema

Automatically created by `supabase_setup.sql`:

### `clients`
```
- id (UUID, primary key)
- user_id (FK to auth.users)
- name (text)
- email (text)
- company (text)
- phone (text, optional)
- created_at, updated_at
```

### `invoices`
```
- id (UUID, primary key)
- user_id (FK to auth.users)
- client_id (FK to clients)
- invoice_number (text)
- amount (decimal)
- status (draft | sent | paid | overdue)
- due_date (date)
- created_at, updated_at
```

### `proposals`
```
- id (UUID, primary key)
- user_id (FK to auth.users)
- client_id (FK to clients)
- proposal_number (text)
- title (text)
- amount (decimal)
- status (draft | sent | accepted | declined)
- created_at, updated_at
```

### `user_profiles`
```
- id (UUID, primary key)
- user_id (FK to auth.users, unique)
- business_name (text, optional)
- phone (text, optional)
- wallet_address (text, optional)
- preferred_network (base | ethereum | polygon | solana)
- created_at, updated_at
```

---

## 🌐 Deploy to Vercel

### Step 1: Push to GitHub
```bash
git add .
git commit -m "feat: production-ready dashboard with real data"
git push origin main
```

### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **Import Project**
3. Select your GitHub repo
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**

### Step 3: Verify Deployment
1. Visit your deployed URL
2. Test full flow: signup → login → dashboard
3. Create test data
4. Verify all pages work

---

## 🌐 Deploy to Netlify

### Step 1: Connect Git
1. Go to [netlify.com](https://netlify.com)
2. Click **Import from Git**
3. Select your GitHub repo

### Step 2: Configure Build
- Build command: `npm run build`
- Publish directory: `.next`

### Step 3: Environment Variables
Go to **Site Settings** → **Build & Deploy** → **Environment** and add:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Step 4: Deploy
Click **Deploy Site** and wait for completion.

---

## 🌐 Deploy to Railway / Other Platforms

### General Steps
1. Ensure `package.json` has proper build scripts
2. Set environment variables in platform's dashboard
3. Run `npm run build && npm run start`
4. Point domain to platform
5. Test all pages

---

## ✅ Deployment Checklist

### Before Deploying
- [ ] Database tables created (run `supabase_setup.sql`)
- [ ] Environment variables set locally and in deployment platform
- [ ] All pages tested locally (signup, login, dashboard, clients, invoices, proposals, settings)
- [ ] Logout button works
- [ ] Navigation between all sections works
- [ ] Create/read/delete operations work for clients, invoices, proposals

### After Deploying
- [ ] Visit deployed URL
- [ ] Test signup with new email
- [ ] Test login
- [ ] Test dashboard loads real data
- [ ] Create test client, invoice, proposal
- [ ] Verify stats update
- [ ] Test settings page (save wallet address)
- [ ] Test logout and login again
- [ ] Check all pages are responsive

---

## 🔒 Security Checklist

- [x] Row Level Security (RLS) enabled on all tables
- [x] Only users can see their own data
- [x] Authentication required for protected routes
- [x] Environment variables not exposed
- [x] No hardcoded secrets in code
- [x] Login/signup form validation
- [x] Password requirements enforced

---

## 📊 Production Optimizations

### Already Implemented
- Supabase client-side caching
- Optimized database queries with indexes
- Lazy-loaded components
- CSS minification with Tailwind
- Image optimization

### Consider Adding Later
- Caching strategy for frequently accessed data
- Database connection pooling
- CDN for static assets
- Monitoring & error tracking (Sentry)
- Analytics (Plausible, Mixpanel)

---

## 🐛 Troubleshooting

### Dashboard shows "Not authenticated"
**Cause:** User not logged in or session expired
**Fix:** 
- Clear browser cookies
- Login again
- Check Supabase project is active

### Stats show 0 for everything
**Cause:** No data in database or database tables not created
**Fix:**
- Run `supabase_setup.sql` to create tables
- Create test client/invoice/proposal
- Refresh page

### Client names show "Unknown Client" on invoices
**Cause:** Client ID doesn't match a client
**Fix:**
- Check client exists before creating invoice
- Verify client_id in database
- Create invoice through UI (auto-selects valid clients)

### Settings won't save
**Cause:** `user_profiles` table doesn't exist or RLS policy issue
**Fix:**
- Run `supabase_setup.sql`
- Check RLS policies in Supabase dashboard
- Clear browser cache and try again

### Login redirects to login instead of dashboard
**Cause:** Session not properly established
**Fix:**
- Wait a moment before page loads (session takes time)
- Check browser console for errors
- Verify Supabase credentials in `.env.local`

### 404 errors on deployed site
**Cause:** Build issues or environment variables not set
**Fix:**
- Check deployment logs in platform dashboard
- Verify environment variables are set
- Run `npm run build` locally to test

---

## 📧 Support

If you encounter issues:

1. **Check logs:**
   - Browser console (F12)
   - Supabase dashboard → Logs
   - Deployment platform logs

2. **Verify setup:**
   - Environment variables are correct
   - Database tables exist
   - RLS policies are enabled

3. **Test locally:**
   - Run `npm run dev`
   - Test full flow locally
   - Check if issue is reproducible

---

## 🎯 Next Steps (Feature Ideas)

### High Priority
- Invoice PDF export
- Email notifications
- Proposal templates
- Client portal

### Medium Priority
- Crypto payment integration (USDC)
- Team management
- API access
- Custom branding

### Low Priority
- Advanced analytics
- Integrations (Slack, Discord)
- Mobile app
- Webhooks

---

## 📝 License

Proprietary - All rights reserved

---

## ✨ You're all set!

Your Verkspay dashboard is production-ready. The database is set up, all pages are functional with real data, and deployment is straightforward.

Deploy with confidence! 🚀
