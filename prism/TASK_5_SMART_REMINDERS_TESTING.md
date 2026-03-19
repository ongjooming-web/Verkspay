# TASK 5: Smart Reminders Verification Guide

**Status:** Infrastructure needs verification  
**Last Updated:** 2026-03-19 14:35 GMT+8

---

## Overview

Smart reminders send automated emails to clients on days 3, 7, and 14 after invoice due date passes.

**Email Provider:** Resend (via `support@prismops.xyz`)

---

## Prerequisites Check

### 1. Cron Job Exists

**File Location:** Check if cron endpoint exists
```bash
cd prism
find . -name "*cron*" -o -name "*reminder*" | grep -E "\.(ts|js)$"
```

**Expected:** `/api/cron/send-reminders` or similar

### 2. Environment Variables

```bash
# Check .env for:
RESEND_API_KEY=re_...
CRON_SECRET=your-secure-random-secret
```

### 3. Email Templates

```bash
# Check for email template files:
find src -path "*/email*" -o -path "*/template*"
```

**Expected:** Templates for overdue reminders

### 4. Database Schema

```sql
-- Verify tables exist:
SELECT * FROM information_schema.tables 
WHERE table_name IN ('invoices', 'payment_records', 'contacts');

-- Check columns:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('due_date', 'status', 'amount_paid', 'reminder_sent_at');
```

---

## Test Plan

### Setup: Create Test Invoice

1. **Create invoice with past due date:**
   - Client: "Test Client" (with valid email: test@example.com)
   - Amount: $500
   - Due Date: **3 days ago** (March 16, 2026)
   - Status: `unpaid`

2. **Save invoice ID** for reference

---

### Test 1: Verify Cron Endpoint Exists

**Manual Trigger (No Authentication Required)**

```bash
curl -X POST https://prism.ongjooming.dev/api/cron/send-reminders \
  -H "Authorization: Bearer [CRON_SECRET]" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "reminders_sent": 1,
  "invoices_processed": 1,
  "message": "Smart reminders sent successfully"
}
```

**If Fails:**
- Check: Endpoint URL is correct
- Check: CRON_SECRET is correct
- Check: Vercel logs for errors

---

### Test 2: Verify Email Sent

**After triggering cron endpoint:**

1. **Check email inbox** (test@example.com or your email)
2. **Look for email with:**
   - From: support@prismops.xyz
   - Subject: "Invoice [#] due in 3 days"
   - Body: Client payment reminder + invoice details + payment link

**Expected Email Content:**
```
Subject: Invoice #INV-001 is overdue

Hi Test Client,

Your invoice #INV-001 is now 3 days overdue.

Amount Due: $500.00
Original Due Date: March 16, 2026
Days Overdue: 3

Please pay at your earliest convenience.

[Pay Now] button → Links to /pay/[invoiceId]

Thank you!
```

---

### Test 3: Verify Database Updated

After sending reminder, check database:

```sql
-- Check if reminder was sent
SELECT id, invoice_id, days_overdue, reminder_type, email_sent, email_sent_at
FROM reminder_logs
WHERE invoice_id = '[test_invoice_id]'
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- email_sent: true
-- reminder_type: '3_day_overdue'
-- email_sent_at: [now]
```

---

### Test 4: Verify No Duplicate Reminders

**Trigger cron endpoint again immediately**

```bash
curl -X POST https://prism.ongjooming.dev/api/cron/send-reminders \
  -H "Authorization: Bearer [CRON_SECRET]"
```

**Expected:**
- No new emails sent
- Same reminder_logs entry (not duplicated)
- Response: `"reminders_sent": 0`

---

### Test 5: Test at Day 7 Overdue

**Manually test 7-day reminder:**

1. **Create another test invoice**
   - Due Date: **7 days ago** (March 12, 2026)

2. **Trigger cron endpoint**

3. **Check email**
   - Subject should mention "7 days overdue"
   - reminder_type should be `7_day_overdue`

---

### Test 6: Test at Day 14 Overdue

**Manually test 14-day reminder:**

1. **Create another test invoice**
   - Due Date: **14 days ago** (March 5, 2026)

2. **Trigger cron endpoint**

3. **Check email**
   - Subject should mention "14 days overdue"
   - reminder_type should be `14_day_overdue`

---

## Scheduled Cron Execution

### Production Schedule (After Testing)

**Cron job should run daily:**
```
0 9 * * * POST /api/cron/send-reminders
```
(9 AM UTC every day)

### Verify in Vercel

1. **Vercel Dashboard → Prism → Crons**
2. **Look for:**
   - Endpoint: `/api/cron/send-reminders`
   - Schedule: `0 9 * * *` (or equivalent)
   - Last run: [should be recent]
   - Status: ✅ Success or ⚠️ Failed

### Check Logs

1. **Vercel Dashboard → Deployments → [latest] → Logs**
2. **Filter by:**
   ```
   cron send-reminders
   ```
3. **Expected logs:**
   ```
   [Cron] Starting smart reminders at 09:00 UTC
   [Cron] Found 3 invoices to process
   [Cron] Sent reminder for invoice INV-001 to client@email.com
   [Cron] Completed: 3 reminders sent
   ```

---

## Failure Modes to Test

### Test: Invoice Already Paid (Should Skip)
1. Create invoice, mark as `paid`
2. Run cron
3. **Expected:** Skipped (not included in results)

### Test: Client Has No Email (Should Handle Gracefully)
1. Create invoice with contact that has no email
2. Run cron
3. **Expected:** Logged as error, other reminders still sent

### Test: Email Service Down (Resend Failure)
1. Temporarily invalidate RESEND_API_KEY
2. Run cron
3. **Expected:** Error logged, retry mechanism triggered (if implemented)

---

## Success Criteria

| Criterion | Status |
|-----------|--------|
| ✅ Cron endpoint exists and responds | TBD |
| ✅ Email sent to client on 3-day threshold | TBD |
| ✅ Email sent to client on 7-day threshold | TBD |
| ✅ Email sent to client on 14-day threshold | TBD |
| ✅ Email contains invoice details | TBD |
| ✅ Email contains payment link | TBD |
| ✅ Database records created (reminder_logs) | TBD |
| ✅ No duplicate reminders sent | TBD |
| ✅ Paid invoices skipped | TBD |
| ✅ Vercel cron scheduler configured | TBD |

---

## Test Report Template

```markdown
## Test Run: [Date/Time]

### Environment Check
- [ ] RESEND_API_KEY configured
- [ ] CRON_SECRET configured
- [ ] Email templates exist
- [ ] reminder_logs table exists

### Test 1: Cron Endpoint
- Endpoint exists: ✅/❌
- Manual trigger successful: ✅/❌
- Response: [...]

### Test 2: Email Delivery
- Email received: ✅/❌
- Email from: support@prismops.xyz
- Email subject: [...]
- Contains payment link: ✅/❌

### Test 3: Database
- reminder_logs entry created: ✅/❌
- email_sent flag: [true/false]
- reminder_type: [3_day/7_day/14_day]

### Test 4: No Duplicates
- Second trigger sent 0 reminders: ✅/❌

### Test 5-6: Multi-day Thresholds
- 7-day reminder sent: ✅/❌
- 14-day reminder sent: ✅/❌

### Vercel Cron Configuration
- Cron job visible in Vercel: ✅/❌
- Schedule: [...]
- Last run status: ✅/⚠️/❌

### Conclusion
✅ All tests passed / ⚠️ Issues found: [...]
```

---

## Troubleshooting

### "Cron endpoint not found"
- Check: `/api/cron/send-reminders` file exists
- Check: Route file is named `route.ts`
- Check: Vercel build succeeded

### "Email not received"
- Check: RESEND_API_KEY is valid
- Check: Email address in contact is correct
- Check: Check spam/junk folder
- Check: Resend dashboard for bounce/delivery errors

### "Reminder sent multiple times"
- Check: Idempotency logic (should skip if already sent)
- Check: Database has unique constraint on (invoice_id, reminder_type)

### "Cron not running on schedule"
- Check: Vercel Crons section shows job
- Check: Check Vercel Crons logs for errors
- Check: Cron secret matches CRON_SECRET

---

## Next Steps After Testing

1. **If ✅ All Pass:**
   - Mark TASK 5 as complete
   - Document test results
   - Enable production cron schedule
   - Monitor first week of automatic runs

2. **If ⚠️ Issues Found:**
   - Debug email delivery
   - Fix cron schedule
   - Re-run tests

---

**Ready to proceed with testing.** 🚀
