# HANDOFF.md - Session 2026-03-18 (22:27 GMT+8)

## Session Summary
Built core invoicing, payment links, subscription billing, smart reminders, and partial payments infrastructure. Fixed critical bugs and security issues.

---

## ✅ CURRENT STATE - Fully Completed

### Phase 1-2: Core Invoicing & Payment Links
- ✅ Invoice CRUD (create, read, update, delete)
- ✅ Client management
- ✅ Public `/pay/[invoiceId]` page (no auth required)
- ✅ Stripe Payment Links (client pays via public page)
- ✅ Auto-mark-paid via Stripe webhook
- ✅ Payment confirmation page

### Phase 3: Subscription Billing
- ✅ Free/Pro/Enterprise tiers with pricing
- ✅ Feature gating by subscription level (hard limits)
- ✅ `/pricing` page (responsive, clean design)
- ✅ Settings page with billing UI
- ✅ Stripe checkout integration
- ✅ Customer portal for managing subscriptions
- ✅ Webhook handlers for subscription lifecycle

### Phase 4: Smart Payment Reminders
- ✅ Email templates (Day 1/3/7 escalation)
- ✅ Manual reminder endpoint: `POST /api/invoices/send-reminder`
- ✅ Automatic cron job: `GET /api/cron/send-reminders` (9 AM UTC daily)
- ✅ Resend email integration
- ✅ Reminder UI card on invoice detail page
- ✅ "Send Reminder" button with status tracking

### Phase 5: Partial Payments (Infrastructure)
- ✅ Database migration: `add_partial_payments.sql`
  - Updated status constraint: `unpaid`, `paid`, `paid_partial`, `overdue`
  - Added `amount_paid` and `remaining_balance` columns
  - Created `payment_records` table for history
  - RLS policies for security
- ✅ `POST /api/invoices/[id]/record-payment` endpoint
  - Records manual partial payments
  - Updates invoice totals and status
  - Creates payment_records entry
- ✅ `POST /api/invoices/[id]/partial-payment-link` endpoint
  - Creates Stripe Payment Links for partial amounts
  - Validates amount vs remaining_balance
- ✅ `PartialPaymentModal.tsx` component
  - Manual payment form (amount, method, date, notes)
  - Stripe payment form (amount, email)
  - Validation and error handling

### Security Fixes
- ✅ Removed manual JWT decode (use `auth.getUser()`)
- ✅ Fixed auth token passing (Bearer tokens in all endpoints)
- ✅ Removed ANON_KEY from server routes (use SERVICE_ROLE_KEY)
- ✅ Added ownership verification checks
- ✅ Shared auth helpers: `/lib/auth.ts` + `/lib/supabase-server.ts`

### Status System Refactor
- ✅ New statuses: `unpaid`, `paid`, `paid_partial`, `overdue`
- ✅ Removed old: `draft`, `sent`, `pending`, `cancelled`
- ✅ Auto-status logic: invoice status updates based on payment state
- ✅ All new invoices default to `unpaid`

### UI/UX Improvements
- ✅ Form validation on invoice creation
- ✅ Error messages show specific failures
- ✅ Filter buttons on invoice list (All/Unpaid/Paid/Paid Partial/Overdue)
- ✅ Stats dashboard (Revenue/Pending/Overdue)
- ✅ Clean pricing page (3 tiers)
- ✅ Settings page with subscription display

### Env Vars Added to Vercel
- ✅ `RESEND_API_KEY` (email sending)
- ✅ `CRON_SECRET` (webhook security)
- ✅ `STRIPE_PRICE_PRO` (server-side, not NEXT_PUBLIC_)
- ✅ `STRIPE_PRICE_ENTERPRISE` (server-side, not NEXT_PUBLIC_)

---

## 🚧 INCOMPLETE WORK - For Next Session

### 1. Partial Payment UI Integration (HIGH PRIORITY)
**File:** `prism/src/app/invoices/[id]/page.tsx`

Add to invoice detail page below the Reminders card:

```tsx
import { PartialPaymentModal } from '@/components/PartialPaymentModal'

// In component state:
const [showManualPaymentModal, setShowManualPaymentModal] = useState(false)
const [showStripePaymentModal, setShowStripePaymentModal] = useState(false)

// Before return statement, add:
{invoice && invoice.status !== 'paid' && (
  <>
    {/* Partial Payments Section */}
    <Card className="mb-8 border-purple-500/30 bg-purple-500/5">
      <CardHeader>
        <h2 className="text-2xl font-bold text-white">💜 Partial Payments</h2>
        <p className="text-gray-400 text-sm mt-1">Record payments or create payment links</p>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Payment Summary */}
        <div className="glass rounded-lg p-4 border-purple-400/30">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-gray-400 text-xs mb-1">Total Amount</p>
              <p className="text-xl font-bold text-white">${invoice.amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Amount Paid</p>
              <p className="text-xl font-bold text-green-400">${(invoice.amount_paid || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Remaining</p>
              <p className="text-xl font-bold text-red-400">${(invoice.remaining_balance || invoice.amount).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setShowManualPaymentModal(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            💰 Record Manual
          </Button>
          <Button
            onClick={() => setShowStripePaymentModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            💳 Create Link
          </Button>
        </div>

        {/* Payment History */}
        {paymentRecords && paymentRecords.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <p className="text-gray-400 text-xs font-semibold mb-3">Payment History</p>
            <div className="space-y-2">
              {paymentRecords.map((record) => (
                <div key={record.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="text-white">${record.amount.toFixed(2)} via {record.payment_method}</p>
                    <p className="text-gray-500 text-xs">{new Date(record.payment_date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>

    {/* Modals */}
    {showManualPaymentModal && (
      <PartialPaymentModal
        invoiceId={invoiceId}
        invoiceNumber={invoice.invoice_number}
        remainingBalance={invoice.remaining_balance || invoice.amount}
        type="manual"
        onClose={() => setShowManualPaymentModal(false)}
        onSuccess={() => {
          fetchInvoiceDetails()
          fetchPaymentRecords()
        }}
      />
    )}

    {showStripePaymentModal && (
      <PartialPaymentModal
        invoiceId={invoiceId}
        invoiceNumber={invoice.invoice_number}
        remainingBalance={invoice.remaining_balance || invoice.amount}
        type="stripe"
        onClose={() => setShowStripePaymentModal(false)}
        onSuccess={() => {
          fetchInvoiceDetails()
          fetchPaymentRecords()
        }}
      />
    )}
  </>
)}
```

### 2. Fetch Payment Records
**File:** `prism/src/app/invoices/[id]/page.tsx`

Add to useEffect:

```tsx
const fetchPaymentRecords = async () => {
  const { data } = await supabase
    .from('payment_records')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false })

  if (data) {
    setPaymentRecords(data)
  }
}

// Call in useEffect
useEffect(() => {
  fetchInvoiceDetails()
  fetchPaymentRecords()
}, [invoiceId])
```

### 3. Add State to Invoice Detail Page

```tsx
const [paymentRecords, setPaymentRecords] = useState<any[]>([])
const [showManualPaymentModal, setShowManualPaymentModal] = useState(false)
const [showStripePaymentModal, setShowStripePaymentModal] = useState(false)
```

### 4. Import PartialPaymentModal

```tsx
import { PartialPaymentModal } from '@/components/PartialPaymentModal'
```

---

## 🐛 KNOWN BUGS - For Next Session

### Bug #1: Stripe Onboarding Complete Not Auto-Saved
**Location:** `prism/src/app/api/stripe/connect/return/route.ts`
**Issue:** After user completes Stripe Connect flow, `stripe_onboarding_complete` is manually set to `true` but should verify via Stripe API
**Fix:** Call `stripe.accounts.retrieve(stripeAccountId)` and check `charges_enabled` before marking complete

### Bug #2: "From:" Field Blank on Public Payment Page
**Location:** `prism/src/app/pay/[id]/page.tsx`
**Issue:** Freelancer name not displaying on public payment page
**Fix:** Check if `freelancer.full_name` is being populated correctly from the public invoice endpoint

### Bug #3: Old Status References in Comments
**Files:** Multiple (non-critical)
- `dashboard/page.tsx` - has `pending` references in comments
- `stripe/webhook/route.ts` - has `sent` reference in comments
**Fix:** Clean up for documentation clarity (low priority)

---

## 📋 NEXT SESSION INSTRUCTIONS

**Start with:**
```
Continue building Prism. Read HANDOFF.md first for full context. 

Then complete the partial payment UI integration on the 
invoice detail page by:
1. Adding the Partial Payments card component to invoices/[id]/page.tsx
2. Importing and wiring up PartialPaymentModal
3. Adding fetchPaymentRecords() to load payment history
4. Testing both manual and Stripe partial payment flows

After UI integration, test:
- Record manual payment ($50 partial on $200 invoice)
- Verify amount_paid updates and status → paid_partial
- Create Stripe payment link for remainder
- Verify webhook updates totals when client pays
```

---

## 📁 KEY FILE LOCATIONS

### Invoice Management
- **Invoice detail page:** `prism/src/app/invoices/[id]/page.tsx` (NEEDS UI INTEGRATION)
- **Invoice list page:** `prism/src/app/invoices/page.tsx`
- **Public payment page:** `prism/src/app/pay/[id]/page.tsx`
- **Payment card component:** `prism/src/components/USDCPaymentCard.tsx`

### Billing & Subscriptions
- **Pricing page:** `prism/src/app/pricing/page.tsx`
- **Settings page:** `prism/src/app/settings/page.tsx`
- **Create checkout:** `prism/src/app/api/billing/create-checkout-session/route.ts`
- **Customer portal:** `prism/src/app/api/billing/customer-portal/route.ts`

### Partial Payments (NEW)
- **Manual payment endpoint:** `prism/src/app/api/invoices/[id]/record-payment/route.ts`
- **Stripe payment link endpoint:** `prism/src/app/api/invoices/[id]/partial-payment-link/route.ts`
- **Modal component:** `prism/src/components/PartialPaymentModal.tsx` (READY TO USE)
- **Database migration:** `prism/supabase-migrations/add_partial_payments.sql`

### Reminders
- **Manual reminder endpoint:** `prism/src/app/api/invoices/send-reminder/route.ts`
- **Cron job:** `prism/src/app/api/cron/send-reminders/route.ts`
- **Email templates:** `prism/src/lib/email-templates.ts`
- **Resend wrapper:** `prism/src/lib/resend.ts`

### Auth & Utilities
- **Auth helper:** `prism/src/lib/auth.ts` (verifyAuth, requireAuth)
- **Server Supabase:** `prism/src/lib/supabase-server.ts` (getSupabaseServer, getSupabaseAuth)
- **Subscription limits:** `prism/src/lib/subscription-limits.ts`

### Webhooks & Stripe
- **Stripe webhook handler:** `prism/src/app/api/stripe/webhook/route.ts`
- **Stripe Connect callback:** `prism/src/app/api/stripe/connect/return/route.ts`
- **Payment link creation:** `prism/src/app/api/stripe/payment-link/route.ts`

---

## 🔑 Environment Variables (All Set)

```
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO (server-side)
STRIPE_PRICE_ENTERPRISE (server-side)
RESEND_API_KEY
CRON_SECRET
DATABASE_URL
MIGRATION_SECRET
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

## 📊 Latest Commits

```
716fe16 - Add Partial Payment feature - API endpoints and modal component
f63c306 - Add partial payments migration SQL
727cf91 - Add form validation and error handling to invoice creation
1554703 - Fix: Remove duplicate getStatusColor function
f1dcd96 - Billing system Phase 1
babe2ce - Build Settings billing section + /pricing page - MVP complete
a620b8d - Fix: Update landing page pricing - Enterprise at $199/mo
081f331 - Refactor: Update invoice statuses to cleaner system
```

---

## 🎯 Success Metrics

After completing next session, test:
- [ ] Create invoice (status: unpaid)
- [ ] Record manual partial payment ($50/$200)
- [ ] Invoice status updates to paid_partial
- [ ] Remaining balance shows $150
- [ ] Create Stripe partial payment link for remainder
- [ ] Client pays via public link
- [ ] Webhook updates totals
- [ ] Invoice marks as paid when amount_paid >= amount
- [ ] Payment history shows all transactions

---

## 🚀 Long-Term Roadmap

**Phase 6:** Recurring invoices (Enterprise only)
**Phase 7:** API keys + webhooks (Enterprise)
**Phase 8:** Team management (Enterprise)
**Phase 9:** Email distribution templates
**Phase 10:** Wallet integration (USDC on Base)

---

**Last Updated:** 2026-03-18 22:27 GMT+8
**Session Duration:** ~1.5 hours
**Commits:** 30+
**Tokens Used:** 177k/200k
