# Quick Start Guide - Get Prism Running in 30 Minutes

## TL;DR (Fast Track)

```bash
# 1. Setup database
# Go to https://supabase.com/dashboard
# SQL Editor → New Query → Paste supabase-schema.sql → Run

# 2. Deploy to Vercel
# Connect repo to Vercel, set env vars, done!

# 3. Test locally (optional)
npm install && npm run dev
# Visit http://localhost:3000
```

---

## Step-by-Step (30 minutes)

### Phase A: Database (10 minutes)

1. **Login to Supabase**
   - Go to https://supabase.com/dashboard
   - Find project `prism-dev`

2. **Run Database Schema**
   - Click **SQL Editor** (left sidebar)
   - Click **+ New Query**
   - Copy entire contents of `supabase-schema.sql` from repo
   - Paste into editor
   - Click **Run**
   - ✅ Should see "Success"

3. **Verify Tables**
   - Click **Database** → **Tables** (left sidebar)
   - Verify you see:
     - `profiles`
     - `clients`
     - `invoices`
     - `proposals`
     - `contracts`

4. **Configure OAuth (Optional but Recommended)**
   - Go to **Authentication** → **Providers**
   - Enable **Google**
   - Enter Google OAuth credentials
   - (Get credentials from Google Cloud Console)

### Phase B: Deploy to Vercel (15 minutes)

1. **Go to Vercel**
   - Visit https://vercel.com
   - Click **New Project**
   - Select GitHub and authorize
   - Find `ongjooming-web/prism`
   - Click **Import**

2. **Set Environment Variables**
   - In Vercel, go to **Settings** → **Environment Variables**
   - Add two variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL = https://fqdipubbyvekhipknxnr.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```
   - Click **Save**

3. **Deploy**
   - Click **Deploy** button
   - Wait ~2-3 minutes
   - ✅ Should see "Congratulations, your site is live"

4. **Configure Custom Domain (Optional)**
   - Go to **Settings** → **Domains**
   - Add `app.prismops.xyz`
   - Follow DNS instructions
   - (DNS takes 24-48h to propagate)

### Phase C: Test (5 minutes)

1. **Visit your app**
   - If deployed: Visit `https://app.prismops.xyz` (or Vercel default URL)
   - If local: Visit `http://localhost:3000`

2. **Test Signup**
   - Click "Sign Up"
   - Enter email and password
   - Click "Sign Up"
   - ✅ Should redirect to login

3. **Test Login**
   - Enter credentials
   - Click "Sign In"
   - ✅ Should see dashboard

4. **Test Features**
   - Try creating a client
   - Try creating an invoice
   - Try creating a proposal
   - Try logging out

5. **Test Protected Routes**
   - Open browser console (F12)
   - Clear cookies (delete "sb-" cookies)
   - Try to access `/dashboard`
   - ✅ Should redirect to `/login`

---

## Local Development (Optional)

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Visit http://localhost:3000

# Make changes, they'll auto-reload

# Build for production
npm run build
npm start
```

---

## Common Issues & Fixes

### Issue: "Can't login after deployment"
**Solution:**
1. Go to Supabase → Authentication → URL Configuration
2. Add to "Redirect URLs":
   - `https://app.prismops.xyz/auth/callback`
   - `http://localhost:3000/auth/callback`

### Issue: "Tables don't exist"
**Solution:**
1. Go to Supabase → SQL Editor
2. Paste `supabase-schema.sql` again
3. Make sure there are no errors
4. Refresh and check Tables section

### Issue: "OAuth not working"
**Solution:**
1. Verify Google credentials are in Supabase
2. Check redirect URI matches exactly: `https://fqdipubbyvekhipknxnr.supabase.co/auth/v1/callback`
3. Test in incognito/private window (clear cookies)

### Issue: "Vercel build failing"
**Solution:**
1. Check build logs in Vercel dashboard
2. Verify environment variables are set
3. Make sure package.json has correct scripts

### Issue: "Domain not working"
**Solution:**
1. Wait 24-48 hours for DNS propagation
2. Test with: `nslookup app.prismops.xyz`
3. Check DNS records at your domain provider
4. Verify CNAME points to `cname.vercel-dns.com`

---

## What You Get

✅ Complete authentication system (email + Google OAuth)  
✅ Dashboard with stats and overview  
✅ Client management (create, view, delete)  
✅ Invoice management (create, view, delete)  
✅ Proposal management (create, view, delete)  
✅ User settings page  
✅ Responsive design (works on mobile)  
✅ Protected routes (auto-login redirect)  
✅ Database with RLS security  

---

## Next Steps

1. **Test thoroughly** - Create test clients, invoices, proposals
2. **Share with users** - Get early feedback
3. **Plan Phase 2:**
   - PDF invoice generation
   - Email notifications
   - Payment processing (Stripe)
   - Invoice reminders
   - More features...

---

## Helpful Links

- **GitHub Repo:** https://github.com/ongjooming-web/prism
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Docs:** https://vercel.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs

---

## Support

- Check `README.md` for general documentation
- Check `DEPLOYMENT.md` for deployment help
- Check `SETUP-DATABASE.md` for database help
- Check `PHASE1-COMPLETE.md` for full feature list

---

**That's it! Your invoicing app is now live. 🚀**

Questions? Check the troubleshooting section above or read the full docs.
