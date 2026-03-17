# Prism Dashboard - Quick Start (30 Seconds)

## TL;DR - Get It Running in 3 Steps

### Step 1: Database
Copy everything from `supabase_setup.sql` and run it in your Supabase SQL Editor.

### Step 2: Environment
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### Step 3: Run
```bash
npm install
npm run dev
```

Visit http://localhost:3000

---

## What You Get

✅ Working login/signup
✅ Real dashboard with actual stats
✅ Create/view/delete clients
✅ Create/view/delete invoices  
✅ Create/view/delete proposals
✅ Settings page with crypto wallet config
✅ All data persists to Supabase
✅ Glassmorphism design throughout

---

## Test Flow

1. Sign up at `/signup`
2. Login at `/login`
3. Redirects to `/dashboard` (shows your stats)
4. Click "Add New Client" → create test client
5. Click "Create Invoice" → create test invoice
6. View stats update on dashboard
7. Check all pages work

---

## Deploy

```bash
git push origin master
```

Then:
- **Vercel:** Connect GitHub repo, add env vars, deploy
- **Netlify:** Connect GitHub repo, add env vars, deploy
- **Other:** Set env vars in your platform, run `npm run build && npm start`

---

## Docs

- `DASHBOARD_SETUP.md` - Full setup guide
- `DEPLOYMENT_GUIDE.md` - How to deploy
- `PRISM_COMPLETION_REPORT.md` - What was built
- `supabase_setup.sql` - Database schema

---

## Troubleshoot

| Problem | Fix |
|---------|-----|
| Stats show 0 | Run `supabase_setup.sql` |
| Not authenticated | Login again, clear cookies |
| Can't create invoice | Create a client first |
| Settings won't save | Check `user_profiles` table exists |
| Build fails | Check env vars are set |

---

## You're Ready! 🚀

Everything is working. Deploy whenever you're ready.
