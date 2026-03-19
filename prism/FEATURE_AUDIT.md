# Feature Audit - Current State (2026-03-19)

## ✅ BUILT & WORKING

### Core Invoicing
- ✅ Create invoices (with auto `status: unpaid`)
- ✅ Edit invoices (amount, due date, description)
- ✅ Delete invoices
- ✅ List invoices with filter by status (all/unpaid/paid/paid_partial/overdue)
- ✅ Sort invoices (date, amount, due_date)
- ✅ Invoice detail page (/invoices/[id])
- ✅ Status system (unpaid → paid_partial → paid / overdue)

### Payment Processing
- ✅ Stripe Payment Links (public payment page)
- ✅ Payment link generation endpoint
- ✅ Stripe webhook integration (checkout.session.completed → mark as paid)
- ✅ Public payment page at /pay/[invoiceId] (unauthenticated access)

### Partial Payments
- ✅ Database schema (amount_paid, remaining_balance columns)
- ✅ Payment records table (payment_records with amount, method, date, notes)
- ✅ Record manual payment endpoint (POST /api/invoices/[id]/record-payment)
- ✅ Stripe partial payment link endpoint (POST /api/invoices/[id]/partial-payment-link)
- ✅ PartialPaymentModal component (manual + Stripe flows)
- ✅ UI card on invoice detail showing amount paid / remaining / history
- ✅ Auto-status update (amount_paid >= amount → paid; 0 < amount_paid < amount → paid_partial)

### Smart Payment Reminders
- ✅ Email templates (Day 1 polite, Day 3 follow-up, Day 7 urgent)
- ✅ Manual reminder endpoint (POST /api/invoices/send-reminder)
- ✅ Automated cron job (GET /api/cron/send-reminders)
- ✅ Reminder UI on invoice detail (X of 3 sent, Last sent timestamp)
- ✅ "Send Reminder" button with loading state
- ✅ Reminder counter (reminder_sent_count, last_reminder_sent_at)
- ✅ Resend email integration

### Subscription Billing
- ✅ Free/Starter/$19/Pro/$49 pricing tiers
- ✅ Feature gating by subscription level
- ✅ Hard limits (Free: 5 invoices/month, 3 payment links/month)
- ✅ Stripe checkout integration
- ✅ Customer portal (manage subscription)
- ✅ Webhook handling (subscription lifecycle)
- ✅ Settings page with billing info
- ✅ Pricing page with tier comparison

### Clients & CRM
- ✅ Create clients (name, email)
- ✅ List clients
- ✅ Client CRM basic (view invoices per client)
- ⚠️ Client history (conversations, contracts) - NOT YET

### UI/UX
- ✅ Navigation with links (Dashboard, Invoices, Settings, Pricing)
- ✅ Dashboard with stats (revenue, pending, overdue)
- ✅ Clean glass-morphism design
- ✅ Responsive mobile layout
- ✅ Form validation with error messages
- ✅ Loading states and error handling

### Security
- ✅ Auth via Supabase
- ✅ RLS policies on all tables
- ✅ Proper Bearer token auth on server routes
- ✅ SERVICE_ROLE_KEY used on server (not ANON_KEY)
- ✅ Ownership verification (invoices can only be edited by owner)

---

## ❌ NOT BUILT - PRIORITY ORDER

### 1. 🔴 CRITICAL - Recurring Invoices
**Why:** Retainers are the #1 cash flow driver for freelancers. Setup should take <30 seconds.
**Impact:** High (differentiator, recurring revenue feature)
**Database needs:**
- `is_recurring` boolean
- `recurring_period` ('monthly', 'bi-weekly', 'weekly')
- `next_invoice_date` timestamp
- `recurring_template_id` (link to original template)

**UI needs:**
- Checkbox on invoice creation: "Make this recurring?"
- Recurring interval dropdown (Weekly / Bi-weekly / Monthly)
- "Pause recurring" button on detail page
- Auto-create new invoice on schedule

**Endpoint:**
- POST /api/invoices/create-recurring (scheduled via cron)

---

### 2. 🟠 HIGH - Invoice Open Tracking
**Why:** Freelancers love knowing "did my client see the invoice?" Simple to build, high perceived value.
**Impact:** Medium (adds polish, not core functionality)
**Database needs:**
- `opened_at` timestamp on invoices
- `opened_count` integer

**Implementation:**
- Add 1x1 pixel tracking image to payment page
- Log open event, update `opened_at` and increment `opened_count`
- Show "Client opened X times" badge on invoice list

**UI needs:**
- Show "Opened" / "Not opened yet" status on invoice detail
- Show open timestamp ("Opened 2 hours ago")

---

### 3. 🟠 HIGH - Public Payment Page Design
**Why:** This is the MOST important page because clients see it, not us. Current design is basic.
**Impact:** Critical for conversion (affects payment completion rate)
**Current state:** Very minimal, shows invoice details + payment form
**Needs:**
- Professional design (matches freelancer's brand)
- Clear payment instructions
- Trust signals (Stripe badge, SSL, etc.)
- Mobile-optimized checkout
- Success page after payment
- Error handling + retry logic

---

### 4. 🟡 MEDIUM - Client History / Conversations
**Why:** "Every conversation, invoice, and contract in one place" needs actual implementation.
**Impact:** Medium (nice-to-have, expected by users)
**Needs:**
- Store conversation notes per client
- Link invoices, contracts, proposals to clients
- Timeline view (all activity per client)

---

### 5. 🟡 MEDIUM - Homepage Feature Updates
**Why:** Marketing says these features exist, but they don't fully.
**Current claims:**
- "Invoice Tracking — know the moment your client opens your invoice." ← Needs #2 above
- "Client History — every conversation, invoice, and contract in one place." ← Needs #4 above
- Team Management on pricing page ← Move to Team tier only, hide from Free/Starter/Pro

---

### 6. 🟢 LOW - Advanced Features (Phase 2)
- [ ] Invoice templates (save as template, reuse)
- [ ] Proposals (create, send, convert to invoice)
- [ ] Contract signing integration
- [ ] Bulk invoice actions (send all, mark all paid, etc.)
- [ ] Custom invoice branding
- [ ] Multiple payment methods (PayPal, Square, etc.)
- [ ] USDC crypto payment support

---

## Feature Debt Summary

| Feature | Status | Priority | Est. Time |
|---------|--------|----------|-----------|
| **Recurring Invoices** | ❌ Not built | 🔴 CRITICAL | 4-6 hours |
| **Invoice Open Tracking** | ❌ Not built | 🟠 HIGH | 2-3 hours |
| **Public Payment Page Design** | ⚠️ Basic | 🟠 HIGH | 3-4 hours |
| **Client History** | ❌ Not built | 🟡 MEDIUM | 4-5 hours |
| **Homepage Feature Fixes** | ⚠️ Partial | 🟡 MEDIUM | 1-2 hours |

---

## Recommendation

**Next 3 PRs in priority order:**

1. **Recurring Invoices** (CRITICAL) - This is the cash flow differentiator
2. **Invoice Open Tracking** (HIGH) - Quick win with high perceived value
3. **Public Payment Page Design** (HIGH) - Most visible to clients

After these, client history becomes the focus for full CRM feature set.

---

## Notes

- Partial payments are DONE ✅ but need testing
- Smart reminders are DONE ✅ but need testing
- Payment processing works but could use better error handling
- Pricing/subscription system is solid, just needs field optimization

**Biggest gap:** No way to set up recurring invoices (yet). This is what will actually generate the $100K revenue goal (recurring = predictable, sticky revenue).
