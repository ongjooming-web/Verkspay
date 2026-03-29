# MEMORY.md - Long-Term Memory

## Who I Am

**Name:** Zenith (⚡)  
**Nature:** AI agent with real autonomy — I build, ship, move capital  
**Mission:** Make $100K revenue  
**Boss:** Zeerac (kevojm)  
**Given:** Full autonomy (no approval needed, just execute)  
**Timezone:** GMT+8

## The Deal

- Built Prism to make $100K
- $1K capital to start (earn more = spend more)
- Full execution autonomy granted (March 15, 2026)
- Weekly updates to Zeerac
- First milestone: $500 MRR (prove model)

## Current Project: Prism

**Agent:** Zenith (me, ⚡)  
**Product:** Prism (freelance ops platform)  
**Vertical:** Freelancers & small agencies (1-5 person teams) — crypto/builder first, mainstream later  
**Problem:** Fragmented workflows — contracts, proposals, invoicing, CRM all separate tools  
**Solution:** Integrated platform combining:
- Smart contract templates (crypto-friendly)
- Proposal builder
- Basic CRM
- Invoicing dashboard
- **Payment:** USDC on Base (Bankr) → Stripe later

**Pricing:** $49/mo freemium → $299/mo pro  
**Launch Timeline:**
- Week 1 (now): Validate with 10-15 users
- Week 2-3: Build MVP
- Week 3-4: Launch to crypto/builder community

**Brand Stack:**
- Twitter: @prismops (owned by me, shared creds with Zeerac)
- Landing: Simple (collect emails, explain the problem)
- Product: Crypto-first (USDC on Base), Stripe funded by revenue

**Why This Vertical:**
- High pain (daily friction in ops)
- High willingness to pay ($300-999/mo)
- Low competition for integrated play
- Sticky (business-critical, switching costs)
- Direct audience (Twitter, Discord, indie communities)

## Capital & Assets

**BOTCOIN Claim:** ✅ COMPLETED (3/16/2026 ~8:09 AM GMT+8)
- Unstaked 50M BOTCOIN from staking contract
- Now in wallet: 0x685bbc9aca1df49bead43c49343de8959ce67fb3
- Value: ~$1,162 USD
- Next: Evaluate whether to hold, trade, or deploy

## Capital Tracking

| Item | Budget | Status |
|------|--------|--------|
| Validation (ads + interviews) | $300 | In progress |
| Hosting + domain + tools | $200 | TBD |
| Launch reserve | $500 | Reserved |
| **Total** | **$1,000** | - |

## Security Standards (Non-Negotiable)

**Established:** 2026-03-18 (after full codebase security audit)  
**Applies to:** All Prism code going forward

### Authentication
- **NEVER** manually decode JWT tokens using `Buffer.from/base64`
- **ALWAYS** use `supabase.auth.getUser(token)` to verify tokens
- **ALWAYS** use shared `verifyAuth()` helper from `/lib/auth.ts`
- **ALWAYS** refresh session before getting token on client side:
  ```typescript
  await supabase.auth.refreshSession()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session.access_token
  ```

### Supabase Client Usage
- Server API routes **ALWAYS** use `SUPABASE_SERVICE_ROLE_KEY`
- **NEVER** use `NEXT_PUBLIC_SUPABASE_ANON_KEY` in server routes
- Client components use client-side supabase instance only
- Import server client from `/lib/supabase-server.ts`
- Export functions: `getSupabaseServer()`, `getSupabaseAuth()`

### Environment Variables
- **NEVER** use `NEXT_PUBLIC_` prefix for server-only secrets
- `NEXT_PUBLIC_` is **ONLY** for values safe to expose to the browser
- Stripe keys, service role keys = **no** `NEXT_PUBLIC_` prefix
- Example: `STRIPE_PRICE_PRO` (not `NEXT_PUBLIC_STRIPE_PRICE_PRO`)

### API Route Checklist
Every new API route must have:
- [ ] `verifyAuth()` at the top for protected routes
- [ ] `try/catch` with proper error handling
- [ ] Service role Supabase client (not anon key)
- [ ] Input validation before processing
- [ ] Proper HTTP status codes (401, 403, 404, 500)
- [ ] Ownership checks (user can only modify own data)

### Code Quality
- Shared helpers go in `/lib/` — never duplicate auth logic
- All database column references must exist in schema
- Test every new endpoint before marking as done
- **No** `console.log` of sensitive data (tokens, keys, emails)
- All routes import from shared helpers, not local instantiation

### Before Every Commit
- ✅ Does this introduce any manual JWT decoding? → Fix it
- ✅ Does this use `ANON_KEY` in a server route? → Fix it
- ✅ Does this expose env vars to the client? → Fix it
- ✅ Does this have proper error handling? → Add it
- ✅ Does this verify user owns the resource? → Add ownership check

### Known Vulnerabilities Fixed
1. **Mark-paid endpoint** - Had manual JWT decode (Buffer.from) → Fixed with `auth.getUser()`
2. **Check-limits endpoint** - Used ANON_KEY in server route → Fixed with SERVICE_ROLE_KEY
3. **Payment-link endpoint** - Missing auth verification → Fixed with `requireAuth()` + ownership check
4. **Billing endpoints** - Inconsistent auth patterns → Refactored to use shared helpers

---

## Prism: Complete Roadmap (March 27, 2026)

### Mission
Build the #1 **AI-powered invoicing platform** for freelancers and small businesses in Malaysia/SEA. Lead with AI intelligence, not just invoicing.

### COMPLETED PHASES

#### Phase 1: Core Platform ✅
- Invoice creation + CRUD (INV-0001 sequential numbering)
- Line items (JSONB: description, qty, rate, amount)
- Payment terms (Due on Receipt, Net 15/30/60/90)
- Multi-currency support (MYR default, inherited from profile)
- Invoice status tracking (unpaid, paid, paid_partial, overdue)
- PDF generation (professional HTML template)
- Stripe Connect + Payment links (checkout sessions)
- Partial payment tracking (manual + Stripe)
- Smart email reminders (3, 7, 14 days overdue via Resend)
- Client management (profiles, list, search, selection)
- Dashboard (revenue cards, charts, activity feed)
- Settings (business profile, currency, Stripe status)

#### Phase 2A: AI Invoice Generator ✅
- Suggestions API endpoint (/api/invoices/suggestions)
- Auto-populate form when client selected
- Suggest line items, rates, payment terms from history
- "Suggested from history" panel with "+ Add" buttons
- Confidence logic based on past invoice frequency
- Silent failure (form works normally if API fails)

#### Phase 3: AI Business Insights ✅
- Data aggregation endpoint (revenue, invoices, clients, payments, trends)
- Claude Haiku AI generation (summaries + recommendations)
- Executive summary with revenue trend badge
- Highlights (positive/warning/action) with color coding
- Client health scores (good/attention/at_risk)
- Actionable recommendations (3-5 per generation)
- Rate limiting per plan (Trial: 10, Starter: 5, Pro: 30, Enterprise: unlimited)
- Persist insights to database (latest_insights JSONB)
- PDF download of insights report
- Dashboard AI Insights widget

#### Stripe Billing Lifecycle ✅
- 15-day free trial (no free tier)
- 3-tier pricing: Starter ($19/mo), Pro ($49/mo), Enterprise ($199/mo)
- Annual billing with 20% discount
- Stripe Checkout integration (6 price IDs)
- Webhook handling (subscription lifecycle)
- stripe_customer_id saved on profile (with fallback)
- Plan updates on subscription change
- Downgrade to trial on cancellation
- Stripe Customer Portal (Manage Billing)
- Master test account bypass (MASTER_TEST_EMAILS env var)

#### Proposals MVP ✅
- Proposals table + CRUD (PROP-0001 sequential numbering)
- Create proposal form with line items
- Proposal list page (status badges: draft/sent/viewed/accepted/declined)
- Proposal detail/view page
- Convert proposal to invoice (one-click)
- Edit proposal (draft only)
- Plan limits (Trial: 3/mo, Starter: 10/mo, Pro+: unlimited)
- Dashboard proposal stats (pipeline value, win rate)

#### Phase 2: Recurring Invoices + WhatsApp ✅
- Recurring invoices table (frequency, schedule, status)
- Template CRUD (create, edit, pause, resume, cancel, delete)
- Sequential numbering (REC-0001 for templates, INV-XXXX for generated invoices)
- Auto-generate invoice drafts via cron (daily 8 AM UTC)
- Status management (active/paused/completed/cancelled)
- WhatsApp integration (wa.me links for send/remind)
- Phone number formatting + validation
- Pre-filled reminder messages (days overdue included)
- Reminders stored in reminders_log with whatsapp_link
- WhatsApp buttons on invoice detail page
- Works on desktop (WhatsApp Web) + mobile (app)

### NEXT PHASES (NOT STARTED)

#### Phase 4: AI-Powered Client Intelligence
- Client health scoring (based on payment history, invoice frequency)
- AI-generated client summaries (spending patterns, engagement)
- Smart follow-up recommendations (overdue, inactive clients)
- Client timeline + activity history
- AI suggestions for client segmentation
- **NOT** a deal pipeline/HubSpot-style CRM — AI focus only

#### Phase 5: Enterprise Features (Later)
- Team management (multiple users per workspace)
- Role-based access (admin, accountant, viewer)
- Audit logs + activity tracking
- Custom branding + white-label option
- API access for 3rd-party integrations
- Multi-workspace support

### Pricing (Locked)

| Plan | Price | Invoices | AI Insights | Proposals | Recurring | Reminders |
|------|-------|----------|-------------|-----------|-----------|-----------|
| **Trial** | Free (15 days) | 20/mo | 10/mo | 3/mo | ❌ | Email only |
| **Starter** | $19/mo | Unlimited | 5/mo | 10/mo | ❌ | Email + WhatsApp |
| **Pro** | $49/mo | Unlimited | 30/mo | Unlimited | ✅ | Email + WhatsApp |
| **Enterprise** | $199/mo | Unlimited | Unlimited | Unlimited | ✅ | Email + WhatsApp + Custom |

### NOT In Scope

❌ Deal pipeline / HubSpot-style CRM  
❌ QuickBooks / Xero integrations (contradicts Prism's AI-first positioning)  
❌ Expense tracking / full accounting  
❌ SMS reminders (WhatsApp only)  
❌ USDC on Base (using Stripe only, funded by revenue)

### Current Status (March 29, 2026)

✅ **All listed phases COMPLETE and deployed to Vercel**  
✅ **Onboarding tour fully implemented** (mobile-responsive, all steps working)  
✅ **Account deletion working** (all user data removed, email sent)  
✅ **RLS security policies added** (protect against unauthorized access)  
⏳ **Ready for user validation** (target: 10-15 freelancers)  
⏳ **Next: Monetization** (launch Stripe subscription)  
⏳ **Then: Phase 4** (if user demand warrants AI client intelligence)

### Key Metrics

- **Target:** $500 MRR (prove model), then $100K MRR
- **CAC:** TBD (validate with users first)
- **Churn assumption:** <5% monthly (sticky product)
- **Runway:** $1,000 capital = ~5 months runway at $200/mo burn

---

## Security Standards (RLS) - March 29, 2026

**Added:** Row-Level Security policies for all user data tables  
**Status:** Ready to deploy (in sql/rls-policies.sql)

### RLS Policies Implemented
- ✅ profiles (SELECT, UPDATE, INSERT, DELETE)
- ✅ invoices (SELECT, INSERT, UPDATE, DELETE)
- ✅ clients (SELECT, INSERT, UPDATE, DELETE)
- ✅ proposals (SELECT, INSERT, UPDATE, DELETE)
- ✅ payment_records (SELECT, INSERT, UPDATE, DELETE)
- ✅ payment_methods (SELECT, INSERT, UPDATE, DELETE)
- ✅ recurring_invoices (SELECT, INSERT, UPDATE, DELETE)
- ✅ reminders_log (SELECT, DELETE via invoice check)

### How It Works
- Each policy enforces: `auth.uid() = user_id`
- Users can ONLY see/modify their own data
- Server routes use SERVICE_ROLE_KEY (bypass RLS, intentional)
- Client code uses ANON_KEY (respects RLS, safe)
- Zero code changes required (already user-scoped)

### Deployment
1. Backup database (Supabase Console → Backups)
2. Go to SQL Editor in Supabase
3. Copy entire `sql/rls-policies.sql`
4. Paste and Run
5. Verify with SQL queries in RLS_SETUP.md
6. Test Prism loads normally

### Impact
- ✅ Stolen anon key = limited to user's own data
- ✅ Compromised session = same protection
- ✅ Prism features = unchanged (zero code modifications)
- ✅ Server routes = still work (service role bypasses RLS)

### Files
- `sql/rls-policies.sql` - All RLS SQL statements
- `RLS_SETUP.md` - Complete setup instructions + verification queries

---

## Daily Standup

Track what I'm doing each day here. Updates will flow into this.
