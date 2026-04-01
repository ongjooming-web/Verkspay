# Verkspay Architecture Overview

**Project:** Verkspay (Prism) — $100K freelance ops platform  
**Tech Stack:** Next.js 15, TypeScript, Supabase, Stripe  
**Owner:** Zenith

## Core Structure

### Frontend (Next.js App Router)
- **Pages:** Dashboard, Invoices, Proposals, Clients, Insights, Settings
- **UI:** Tailwind + Lucide icons + Recharts
- **Auth:** Supabase Auth (middleware-enforced)
- **State:** Server Components default, Client Components isolated

### Backend & Database
- **Auth:** Supabase (email + OAuth)
- **DB:** PostgreSQL with RLS (multi-tenant isolation)
- **Payments:** Stripe (+ Stripe Connect for merchant payouts)
- **Email:** Resend (transactional)
- **AI:** Claude (insights & summaries)

### Key Features
1. **Invoicing:** Create, send, track, pay. Recurring templates + reminders.
2. **Proposals:** Draft, send, track opens/acceptances. Tier-based limits.
3. **Client CRM:** Full master data, notes, tags, auto-tagging, AI summaries.
4. **Billing:** Stripe integration, subscription tiers, usage limits.
5. **Analytics:** AI-generated insights, revenue forecast, PDF reports.

## Data Model
- `invoices`, `recurring_invoices`, `payment_records`
- `proposals`
- `clients`, `client_notes`, `client_tags`
- `profiles` (user account + subscription)
- `follow_ups`, `insights`

## Security
- **RLS Policies:** Every query enforced by Supabase RLS (auth.uid())
- **API:** All routes validate `auth.user()` in middleware
- **Secrets:** Stored in .env, never exposed
- **Stripe:** Webhook signature verification, separate test/prod keys

## Deployment
- **Host:** Vercel (auto-deploy on push)
- **DB:** Supabase (cloud PostgreSQL)
- **CI:** GitHub Actions (optional E2E tests)

---

**For detailed decisions, see DECISIONS.md**  
**For code rules, see RULES.md**
