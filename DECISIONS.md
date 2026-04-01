# Verkspay — Key Architectural Decisions

## Architecture
- **Framework:** Next.js App Router (Server Components default)
- **Auth:** Supabase (JWT-based, RLS-enforced)
- **Database:** PostgreSQL with Row-Level Security (multi-tenant)
- **Payments:** Stripe + Stripe Connect (merchant payouts)
- **Deployment:** Vercel + Supabase cloud

## Key Decisions

### 1. RLS as Security Source of Truth
**Why:** Database-level user isolation prevents app-level bugs. Every query filtered by auth.uid().  
**Trade-off:** Requires careful RLS policy design, but eliminates security duplication.

### 2. Stripe Connect for Merchant Payouts
**Why:** Users connect their own Stripe account → own payment history. No middleman transfers.  
**Implementation:** `profiles.stripe_customer_id` linked to Stripe Connect account.

### 3. Server Components Default
**Why:** Keeps JS payload small, queries run server-side, secrets stay secure.  
**Pattern:** Isolate interactive parts in `'use client'` — parent stays Server Component.

### 4. Recurring Invoice Templates (Not Just Cron)
**Why:** Users control which invoices auto-generate. Fail-safe: templates preserve intent.  
**Implementation:** `recurring_invoices` table, `api/cron/generate-recurring-invoices` webhook-triggered.

### 5. Partial Payment Tracking
**Why:** Freelancers get partial upfront → track what's paid vs. outstanding.  
**Implementation:** `payment_records` table links to `invoices`, amounts + dates.

### 6. Email via Resend (Not SMTP)
**Why:** Modern API, delivery tracking, bounce handling. Cheaper than SES for small volume.

### 7. AI Insights via Claude
**Why:** Context-aware analysis of client history + growth opportunities.  
**Implementation:** On-demand API calls, not fine-tuned model.

### 8. Crypto Payments as Optional Add-On
**Why:** Primary is Stripe (universal). USDC on Solana/EVM for crypto-native users.  
**Trade-off:** Two payment flows, but flexibility worth it.

---

See RULES.md for code governance.
