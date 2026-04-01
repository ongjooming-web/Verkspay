# Verkspay — Code Rules & Governance

## Security Rules

### Database
- ✅ All queries go through RLS (auth.uid() is enforced)
- ✅ Never use service_role key from client
- ✅ Validate user ownership in API routes (double-check with RLS)
- ❌ Don't bypass RLS with raw SQL

### Stripe
- ✅ Verify webhook signatures with `stripe.webhooks.constructEvent()`
- ✅ Store stripe_customer_id in profiles, not session
- ✅ Use publishable key on client, secret key on server only
- ✅ Log all payment events
- ❌ Don't expose STRIPE_SECRET_KEY to frontend

### Secrets
- ✅ All keys in .env files (not Git)
- ✅ Vercel: Set environment variables in dashboard
- ❌ Don't commit .env files
- ❌ Don't hardcode API keys

---

## Architecture Rules

### Server Components
- ✅ Pages/layouts are Server Components by default
- ✅ Queries run server-side only
- ✅ Extract interactive UI to `'use client'` components
- ❌ Don't use useState in Server Components
- ❌ Don't fetch from client when possible

### API Routes
- ✅ Every route checks `auth.user()` at top
- ✅ Return 401 if not authenticated
- ✅ Use RLS for multi-tenancy (users see only their data)
- ✅ Validate input before DB insert
- ❌ Don't trust client-side validation alone

### Database Migrations
- ✅ Create timestamped files in `supabase-migrations/`
- ✅ Include up AND down migrations
- ✅ Test locally before prod deployment
- ✅ Never edit migrations after running in prod
- ❌ Don't drop columns without backup

---

## Feature Rules

### Invoices
- ✅ Invoice number unique per-user (use sequence table)
- ✅ Status flow: draft → sent → paid (no backwards)
- ✅ Amounts must be > 0
- ✅ Email sent via Resend (logged in DB)
- ✅ PDF generated server-side
- ❌ Don't mark paid without Stripe webhook confirmation
- ❌ Don't allow negative amounts

### Proposals
- ✅ Track state: draft, sent, viewed, accepted
- ✅ Enforce tier-based limits (free vs pro)
- ✅ Email tracking via Resend
- ✅ Auto-number per-user
- ❌ Don't allow duplicate sends (check timestamps)
- ❌ Don't bypass limits

### Clients
- ✅ Full CRM fields: name, email, company, phone
- ✅ User-created tags (no predefined list)
- ✅ Auto-tagging optional (AI-powered)
- ✅ Client notes for relationship tracking
- ✅ Soft-delete preferred (not hard delete)

### Payments
- ✅ Log all payment attempts
- ✅ Support partial payments (payment_records table)
- ✅ Verify payment from Stripe webhook before marking paid
- ✅ Prevent double-payment (check status)
- ❌ Don't trust client-side payment status

---

## Code Quality

### TypeScript
- ✅ Zero type errors (strict mode)
- ✅ Explicit prop types for components
- ✅ Extract logic to hooks in `src/hooks/`
- ❌ Don't use `any` type
- ❌ Don't ignore TypeScript errors

### Components
- ✅ Under 200 lines (extract sub-components if larger)
- ✅ Use Lucide icons (not emojis)
- ✅ Props are well-named and documented
- ✅ Extract repeated logic to hooks
- ❌ Don't hardcode strings (use constants)
- ❌ Don't inline large blocks of logic

### Forms
- ✅ Client-side validation (React Hook Form / Zod)
- ✅ Server-side validation (double-check)
- ✅ Clear error messages
- ✅ Loading state while submitting
- ❌ Don't skip server validation
- ❌ Don't leave forms without feedback

---

## Testing

- ✅ E2E tests cover critical paths (signup → invoice → payment)
- ✅ Use staging Stripe keys in test
- ✅ Mock external APIs (Resend, Claude)
- ✅ Clean up test data (delete after)
- ❌ Don't test directly against production

---

## Deployment

### Vercel
- ✅ Environment variables in Vercel dashboard
- ✅ Main branch auto-deploys
- ✅ Preview deployments for PRs
- ❌ Don't push secrets to Git

### Database
- ✅ Migrations run before deployment
- ✅ Backups enabled
- ✅ Point-in-time recovery tested
- ❌ Don't manually edit schema (use migrations)

---

## Documentation

- ✅ Document API endpoints (params, responses)
- ✅ Maintain QUICK_START.md for setup
- ✅ Explain environment variables
- ✅ Troubleshoot common issues
- ❌ Don't rely on code comments instead of docs

---

## Commits

- ✅ Clear messages: `feat: add invoice reminders`
- ✅ Feature branches before merge
- ✅ PR descriptions explain why
- ✅ Code review before merge
- ❌ Don't commit secrets
- ❌ Don't force-push to main
