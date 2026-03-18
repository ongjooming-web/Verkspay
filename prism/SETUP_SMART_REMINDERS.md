# Smart Payment Reminders - Setup Guide

## Overview
Automatic payment reminders for overdue invoices. Escalates from polite to firm over 7 days.

---

## Step 1: Install Resend

```bash
npm install resend
```

---

## Step 2: Get Resend API Key

1. Go to https://resend.com
2. Sign up (if new)
3. Create API key in dashboard
4. Copy the key

---

## Step 3: Add Environment Variables to Vercel

**Environment variables to add:**

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
CRON_SECRET=your-secure-random-secret-here
```

**To add to Vercel:**
1. Go to Vercel project settings
2. Environment Variables
3. Add `RESEND_API_KEY` (production only recommended)
4. Add `CRON_SECRET` (generate a random string)

---

## Step 4: Run Database Migration

**Option A: Via API endpoint** (already exists)
```bash
curl -X POST https://app.prismops.xyz/api/migrate \
  -H "Authorization: Bearer YOUR_MIGRATION_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -H "Authorization: Bearer $MIGRATION_SECRET"
```

**Option B: Manually in Supabase**
1. Go to Supabase SQL Editor
2. Copy contents of `prism/supabase-migrations/add_reminder_tracking.sql`
3. Run the query
4. Verify columns exist:
   - `invoices.reminder_sent_count` (INT, default 0)
   - `invoices.last_reminder_sent_at` (timestamptz)

---

## Step 5: Verify Configuration

**Check migration worked:**
```sql
SELECT * FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('reminder_sent_count', 'last_reminder_sent_at');
```

Should return 2 rows.

---

## Endpoints

### Manual Reminder: POST /api/invoices/send-reminder

**Request:**
```json
{
  "invoiceId": "uuid-of-invoice"
}
```

**Response (success):**
```json
{
  "success": true,
  "message": "Reminder 1 of 3 sent",
  "reminderCount": 1,
  "sentAt": "2026-03-18T16:30:00Z"
}
```

**Response (error examples):**
- 400: Invoice not overdue
- 400: Invoice already paid
- 400: Max 3 reminders reached
- 401: Unauthorized (invalid token)
- 404: Invoice not found

**Note:** Requires Bearer token (freelancer auth)

---

### Automatic Reminders: GET /api/cron/send-reminders

**Schedule:** Daily at 9 AM UTC (configurable in vercel.json)

**Required header:**
```
Authorization: Bearer YOUR_CRON_SECRET
```

**Vercel automatically calls this endpoint daily.** You can test manually:
```bash
curl https://app.prismops.xyz/api/cron/send-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response:**
```json
{
  "success": true,
  "totalReminders": 5,
  "duration": 1234,
  "results": [
    {
      "stage": "Day 1 - First reminder",
      "count": 3,
      "sent": 3,
      "failed": 0,
      "status": "success"
    },
    {
      "stage": "Day 3 - Second reminder",
      "count": 1,
      "sent": 1,
      "failed": 0,
      "status": "success"
    },
    {
      "stage": "Day 7 - Final reminder",
      "count": 1,
      "sent": 1,
      "failed": 0,
      "status": "success"
    }
  ]
}
```

---

## Email Templates

### Day 1: Polite Reminder
- Subject: "Invoice XXX is now due"
- Tone: Friendly reminder
- Color: Blue (default)

### Day 3: Follow-up
- Subject: "Following up: Invoice XXX is 3 days overdue"
- Tone: Friendly but more direct
- Color: Amber/Yellow (warning)

### Day 7: Action Required
- Subject: "⚠️ URGENT: Invoice XXX is 7 days overdue - Action required"
- Tone: Firm, requires action
- Color: Red (urgent)

Each template includes:
- Invoice number & amount
- Due date
- "Pay Now" button linking to `/pay/[invoiceId]`
- Freelancer name

---

## How It Works

### Manual Reminders (Freelancer-initiated)
1. Freelancer opens invoice detail page
2. Clicks "Send Reminder Now" button
3. System checks:
   - Invoice is unpaid ✓
   - Invoice is overdue ✓
   - Not already paid ✓
   - Under 3 reminders sent ✓
4. Appropriate template selected based on `reminder_sent_count`
5. Email sent to client via Resend
6. `reminder_sent_count` and `last_reminder_sent_at` updated

### Automatic Reminders (Cron-based)
1. Cron job runs daily at 9 AM UTC
2. Finds all overdue unpaid invoices
3. Groups by reminder stage:
   - `reminder_sent_count=0 AND due_date=yesterday` → Send Day 1
   - `reminder_sent_count=1 AND due_date=3_days_ago` → Send Day 3
   - `reminder_sent_count=2 AND due_date=7_days_ago` → Send Day 7
4. Sends appropriate template for each
5. Increments `reminder_sent_count`
6. Logs results

---

## Testing

### Test Locally
Set environment variables in `.env.local`:
```
RESEND_API_KEY=test_key_here
CRON_SECRET=test_secret_here
```

### Test Manual Reminder
1. Create an invoice with due date in the past
2. Call POST /api/invoices/send-reminder with invoiceId
3. Verify response is success
4. Check database: `reminder_sent_count` should be 1

### Test Cron
1. Call GET /api/cron/send-reminders with CRON_SECRET header
2. Should return results of reminders sent
3. In Vercel logs, search for `[cron/send-reminders]` to see details

---

## Troubleshooting

### Emails not sending
**Check:**
- RESEND_API_KEY is set in Vercel
- Client has valid email address in database
- Check Resend dashboard for bounce/failure logs

### Cron not running
**Check:**
- Vercel cron config in vercel.json is correct
- CRON_SECRET is set in Vercel env vars
- Check Vercel logs for cron execution

### Wrong template sending
**Check:**
- `reminder_sent_count` column values are correct
- Due date in invoice is actually in the past

---

## Files Added

- `src/lib/email-templates.ts` - Email template functions
- `src/lib/resend.ts` - Resend wrapper
- `src/app/api/invoices/send-reminder/route.ts` - Manual reminder endpoint
- `src/app/api/cron/send-reminders/route.ts` - Automatic reminder cron job
- `supabase-migrations/add_reminder_tracking.sql` - Database migration
- `vercel.json` - Cron schedule configuration

---

## Next Steps

1. ✅ Install resend: `npm install resend`
2. ✅ Get RESEND_API_KEY from resend.com
3. ✅ Add RESEND_API_KEY to Vercel env vars
4. ✅ Generate CRON_SECRET (random string) and add to Vercel
5. ✅ Run database migration
6. ✅ Deploy to Vercel
7. ✅ Test manual reminder endpoint
8. ✅ Test cron job manually
9. ✅ Wait for cron to run at 9 AM UTC
10. ✅ Add UI to invoice detail page (show reminder status, send button)

---

**Status:** ✅ Ready to deploy  
**Last updated:** 2026-03-18
