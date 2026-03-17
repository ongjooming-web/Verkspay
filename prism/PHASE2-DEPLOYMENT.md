# Phase 2 Deployment Guide

## Quick Start

### 1. Apply Database Migrations

Run the SQL migration file in your Supabase dashboard:

1. Go to https://app.supabase.com
2. Select your project
3. Go to SQL Editor
4. Click "New query"
5. Copy and paste the contents of `supabase-migrations.sql`
6. Click "Run"

This will create:
- `client_notes` table (for contact history)
- `payment_records` table (for payment tracking)
- Add address fields to `clients` table
- Add payment tracking fields to `invoices` table
- Create indexes for performance
- Set up Row-Level Security policies

### 2. Verify Database Changes

Check your Supabase dashboard:
- Tables: You should see `client_notes` and `payment_records`
- Columns: Check `clients` table has address fields
- Columns: Check `invoices` table has `paid_date` and `payment_method`

### 3. Local Testing

```bash
# Install dependencies (if needed)
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### 4. Test Features

**Dashboard:**
- ✅ View charts and metrics
- ✅ See overdue alert (if applicable)
- ✅ Check monthly revenue trend

**Invoices:**
- ✅ Create new invoice
- ✅ Edit invoice details
- ✅ View invoice detail page
- ✅ Test "Mark as Paid" payment flow
- ✅ Delete invoice

**Clients:**
- ✅ Add new client
- ✅ View client detail page
- ✅ Edit client information
- ✅ Add contact notes
- ✅ View contact history
- ✅ See related invoices and proposals

### 5. Deploy to Production

#### Option A: Vercel (Recommended)

```bash
# Push to GitHub
git add .
git commit -m "Phase 2: Complete invoicing system, CRM improvements, and dashboard enhancements"
git push origin main

# Vercel will auto-deploy from your GitHub repo
# Check: https://vercel.com/dashboard
```

#### Option B: Manual Deploy

```bash
# Build
npm run build

# Test production build
npm start

# Deploy using your preferred provider
# (Vercel, Netlify, AWS, DigitalOcean, etc.)
```

## Environment Variables

Verify your `.env.local` has these variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

These should already be set from Phase 1.

## Database Rollback (If Needed)

If you need to rollback the migrations:

```sql
-- Drop new tables
DROP TABLE IF EXISTS payment_records CASCADE;
DROP TABLE IF EXISTS client_notes CASCADE;

-- Drop new columns (if you want to remove them)
ALTER TABLE clients DROP COLUMN IF EXISTS notes;
ALTER TABLE clients DROP COLUMN IF EXISTS address;
ALTER TABLE clients DROP COLUMN IF EXISTS city;
ALTER TABLE clients DROP COLUMN IF EXISTS state;
ALTER TABLE clients DROP COLUMN IF EXISTS zip_code;
ALTER TABLE clients DROP COLUMN IF EXISTS country;
ALTER TABLE clients DROP COLUMN IF EXISTS last_contact_date;

ALTER TABLE invoices DROP COLUMN IF EXISTS paid_date;
ALTER TABLE invoices DROP COLUMN IF EXISTS payment_method;
```

## Troubleshooting

### Issue: "Table does not exist" errors

**Solution:** Run the migrations in `supabase-migrations.sql` again

### Issue: Charts not showing

**Solution:** 
- Check browser console for errors
- Verify Recharts is installed: `npm list recharts`
- Ensure data is fetching correctly

### Issue: Payment modal not working

**Solution:**
- Check console for errors
- Verify invoice has a valid client_id
- Check Supabase RLS policies allow inserts to `payment_records`

### Issue: Client detail page not loading

**Solution:**
- Verify client_id is correct in URL
- Check Supabase connection
- Verify user is authenticated

## Performance Notes

- Monthly chart loads 6 months of data (fast)
- Client list fetches stats per client (consider pagination for 100+ clients)
- Dashboard queries are optimized with indexes
- Payment records use the indexed invoice_id

## Security Notes

- ✅ All data is user-scoped with RLS policies
- ✅ Payment records are user-scoped
- ✅ Client notes are user-scoped
- ✅ No sensitive data stored (amounts are non-PII)
- ✅ USDC payment flow is simulated (no real transactions)

## Features Verification Checklist

After deployment, verify:

- [ ] Dashboard loads with charts
- [ ] Can create invoice
- [ ] Can edit invoice
- [ ] Can delete invoice
- [ ] Payment modal works on invoice detail
- [ ] Can add client
- [ ] Client detail page loads
- [ ] Can edit client
- [ ] Can add notes to client
- [ ] Contact history displays
- [ ] Client delete works
- [ ] Search filters work
- [ ] Sort options work
- [ ] Overdue alert shows correctly

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify all migrations were applied
4. Check environment variables are set correctly
5. Try clearing browser cache and reloading

## Monitoring

After deployment, monitor:

1. **Supabase Dashboard:**
   - Database connections
   - API requests/errors
   - Storage usage

2. **Vercel/Deployment Dashboard:**
   - Build status
   - Runtime errors
   - API routes status

3. **Application:**
   - Error pages
   - Slow queries
   - User feedback

## Next Phase (Phase 3 Ideas)

Once Phase 2 is stable:
- Proposal management system
- Contract tracking
- Automated email reminders
- PDF invoice generation
- Real cryptocurrency integration
- Team collaboration features
- Advanced reporting and analytics

---

**Status:** Ready for Production Deployment ✅

All Phase 2 features are implemented, tested, and ready to deploy.
